import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type OrderStatusType, type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { ApiError } from '@/shared/api';
import { colors } from '@/shared/config/tokens';
import { formatKrw } from '@/shared/lib/format';
import {
  ActionBar,
  AppHeader,
  Card,
  ConfirmSheet,
  ErrorState,
  Icon,
  KeyValue,
  MenuGroup,
  MenuRow,
  Screen,
  SectionHeader,
  showToast,
  SkeletonRows,
  StatusChip,
  Timeline,
} from '@/shared/ui';

import { cancelOrder, orderDetailQueryOptions, updateOrderStatus } from '../api/orders';
import { ordersKeys } from '../api/queryKeys';
import { CANCEL_COPY, type CancelInput } from '../model/cancel-form';
import { formatDateTime, formatSigned } from '../model/format';
import { orderErrorMessage } from '../model/messages';
import { cancellationRows, type PaymentRow, settlementRows } from '../model/payment';
import {
  autoTransitionNotice,
  buildTimeline,
  noShowWindow,
  orderActions,
  orderStatusView,
  paymentBreakdown,
} from '../model/status';
import { useOrderUpdates } from '../model/use-order-updates';
import { BuyerChatRow } from './buyer-chat-row';
import { CancelOrderSheet } from './cancel-order-sheet';
import { OrderItemCard } from './order-item-card';
import { type OtherAction, OtherActionsSheet } from './other-actions-sheet';

type Order = SellerOrderDetailQuery['sellerOrder'];
type Change = { done: string } & ({ to: OrderStatusType } | { cancel: CancelInput });

const backToList = () => (router.canGoBack() ? router.back() : router.replace('/orders'));

export function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery(orderDetailQueryOptions(id));
  const cancelSheet = useRef<BottomSheetModal>(null);
  const moreSheet = useRef<BottomSheetModal>(null);
  const noShowSheet = useRef<BottomSheetModal>(null);
  // 성공하면 다시 마운트해 취소 시트 입력을 비운다
  const [cancelKey, setCancelKey] = useState(0);
  // 노쇼 가능 구간은 '다른 처리'를 연 시각으로 판정한다
  const [now, setNow] = useState(() => new Date());
  useOrderUpdates();

  const mutation = useMutation({
    mutationFn: async (v: Change) => {
      if ('cancel' in v) await cancelOrder({ orderId: id, ...v.cancel });
      else await updateOrderStatus({ orderId: id, toStatus: v.to });
    },
    onSuccess: (_, v) => {
      for (const sheet of [cancelSheet, moreSheet, noShowSheet]) sheet.current?.dismiss();
      if ('cancel' in v) setCancelKey((k) => k + 1);
      showToast.success(v.done);
    },
    onError: (e) => showToast.error(orderErrorMessage(e)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ordersKeys.all }),
  });

  if (!query.data) {
    return (
      <Screen edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader title="주문 상세" onBack={backToList} />
        {query.isPending ? (
          <View className="px-5">
            <SkeletonRows count={3} card />
          </View>
        ) : query.error instanceof ApiError && query.error.classification === 'NOT_FOUND' ? (
          <ErrorState
            title="주문을 찾을 수 없어요"
            description="삭제되었거나 이 매장의 주문이 아니에요"
            retryLabel="목록으로"
            onRetry={backToList}
          />
        ) : (
          <ErrorState onRetry={() => void query.refetch()} />
        )}
      </Screen>
    );
  }

  const order = query.data;
  const actions = orderActions(order.status);
  const cancelMode = actions.cancel;
  const noShow = noShowWindow(order, now);
  // 환불 상한은 확인된 결제액이다. 결제 도입 전 주문은 결제 기록이 없어 0
  const refundable = order.paymentMethod ? order.totalPrice : 0;
  const switchTo = (sheet: typeof cancelSheet) => {
    moreSheet.current?.dismiss();
    sheet.current?.present();
  };
  const others: OtherAction[] = [
    ...actions.others.map((to): OtherAction =>
      to === 'PICKED_UP'
        ? {
            key: to,
            title: '픽업 완료',
            description: '구매자가 주문을 받아 갔어요',
            onPress: () => {
              moreSheet.current?.dismiss();
              mutation.mutate({ to, done: '픽업 완료로 바꿨어요' });
            },
          }
        : {
            key: to,
            title: '노쇼',
            description: noShow.reason,
            onPress: noShow.enabled ? () => switchTo(noShowSheet) : undefined,
          },
    ),
    ...(cancelMode === 'cancel'
      ? [
          {
            key: 'CANCEL',
            title: '주문 취소',
            description: '사정에 따라 환불 금액이 정해져요',
            danger: true,
            onPress: () => switchTo(cancelSheet),
          },
        ]
      : []),
  ];

  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="주문 상세" onBack={backToList} />
      <OrderBody order={order} />
      <OrderActionBar
        status={order.status}
        busy={mutation.isPending}
        onNext={(next) => mutation.mutate(next)}
        onReject={() => cancelSheet.current?.present()}
        onMore={() => {
          setNow(new Date());
          moreSheet.current?.present();
        }}
      />
      {cancelMode ? (
        <CancelOrderSheet
          key={`${order.status}-${cancelKey}`}
          ref={cancelSheet}
          mode={cancelMode}
          total={refundable}
          loading={mutation.isPending}
          onSubmit={(cancel) => mutation.mutate({ cancel, done: CANCEL_COPY[cancelMode].done })}
        />
      ) : null}
      {cancelMode === 'cancel' ? <OtherActionsSheet ref={moreSheet} actions={others} /> : null}
      {actions.others.includes('NO_SHOW') ? (
        <ConfirmSheet
          ref={noShowSheet}
          title="노쇼로 처리할까요?"
          description="환불 없이 끝나고 픽업 완료와 같이 정산돼요. 되돌릴 수 없어요."
          confirmLabel="노쇼 처리"
          loading={mutation.isPending}
          onConfirm={() => mutation.mutate({ to: 'NO_SHOW', done: '노쇼로 처리했어요' })}
        />
      ) : null}
    </Screen>
  );
}

function Rows({ rows }: { rows: PaymentRow[] }) {
  return rows.map((row) => (
    <View key={row.label}>
      <KeyValue label={row.label} value={row.value} />
      {row.hint ? (
        <Text className="text-right font-sans text-xs tracking-tight text-muted">{row.hint}</Text>
      ) : null}
    </View>
  ));
}

function OrderBody({ order }: { order: Order }) {
  const pay = paymentBreakdown(order);
  const status = orderStatusView(order.status);
  const autoNotice = autoTransitionNotice(order);
  const canceled = cancellationRows(order);
  const call = () =>
    Linking.openURL(`tel:${order.buyerPhone.replace(/[^\d+]/g, '')}`).catch(() =>
      showToast.error('전화를 걸 수 없어요'),
    );
  return (
    <ScrollView contentContainerClassName="px-5 pb-6">
      <Card
        title="주문번호"
        aside={<StatusChip tone={status.tone} label={status.label} />}
        className="mt-4"
      >
        <Text selectable className="mb-2 font-sans text-sm tracking-tight text-sublabel">
          {order.orderNumber}
        </Text>
        <Text className="mb-1 mt-3.5 font-sans text-sm tracking-tight text-sublabel">
          픽업 일시
        </Text>
        <Text className="font-sans text-4xl font-bold tracking-tighter text-text">
          {formatDateTime(order.pickupAt, true)}
        </Text>
        <KeyValue label="주문 일시" value={formatDateTime(order.createdAt, true)} />
        {autoNotice ? (
          <View className="mt-2 rounded-lg bg-tint2 p-3">
            <Text className="font-sans text-sm tracking-tight text-text3">{autoNotice}</Text>
          </View>
        ) : null}
      </Card>

      <SectionHeader title="주문자" />
      <MenuGroup>
        <MenuRow
          title={order.buyerName}
          description={order.buyerPhone}
          accessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${order.buyerName}에게 전화 걸기`}
              onPress={() => void call()}
              className="h-11 w-11 items-center justify-center"
            >
              <Icon name="phone" size={20} color={colors.muted} />
            </Pressable>
          }
        />
        <BuyerChatRow accountId={order.accountId} />
      </MenuGroup>

      {order.requestNote ? (
        <>
          <SectionHeader title="요청 사항" />
          <Card>
            <Text
              selectable
              className="font-sans text-base leading-[21px] tracking-tight text-text"
            >
              {order.requestNote}
            </Text>
          </Card>
        </>
      ) : null}

      <SectionHeader title="주문 상품" count={`${order.items.length}건`} />
      <View className="gap-3">
        {order.items.map((item) => (
          <OrderItemCard key={item.id} item={item} />
        ))}
      </View>

      <SectionHeader title="결제" />
      <Card>
        <KeyValue label="상품 금액" value={formatKrw(pay.product)} />
        <KeyValue label="옵션 추가" value={formatSigned(pay.options)} />
        <KeyValue
          label="할인"
          value={pay.discount > 0 ? `-${formatKrw(pay.discount)}` : formatKrw(0)}
        />
        <KeyValue label="총액" value={formatKrw(pay.total)} total />
        <View className="mt-2 border-t border-line2 pt-2">
          <Rows rows={settlementRows(order)} />
        </View>
        {canceled.length > 0 ? (
          <View className="mt-2 border-t border-line2 pt-2">
            <Rows rows={canceled} />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="진행 이력" />
      <Card>
        <Timeline items={buildTimeline(order)} />
      </Card>
    </ScrollView>
  );
}

function OrderActionBar({
  status,
  busy,
  onNext,
  onReject,
  onMore,
}: {
  status: OrderStatusType;
  busy: boolean;
  onNext: (next: { to: OrderStatusType; done: string }) => void;
  onReject: () => void;
  onMore: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { next, cancel, notice } = orderActions(status);
  if (!next) {
    return (
      <View
        className="bg-surface px-3.5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="rounded-lg bg-tint2 p-3">
          <Text className="font-sans text-sm tracking-tight text-text3">{notice}</Text>
        </View>
      </View>
    );
  }
  const secondary =
    cancel === 'reject'
      ? { title: '거절', variant: 'dangerOutline' as const, onPress: onReject }
      : cancel
        ? { title: '다른 처리', onPress: onMore }
        : undefined;
  return (
    <ActionBar
      primary={{ title: next.label, loading: busy, onPress: () => onNext(next) }}
      secondary={secondary && { ...secondary, disabled: busy }}
    />
  );
}
