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
  TextField,
  Timeline,
} from '@/shared/ui';

import { orderDetailQueryOptions, updateOrderStatus } from '../api/orders';
import { ordersKeys } from '../api/queryKeys';
import { formatDateTime, formatSigned } from '../model/format';
import { orderErrorMessage } from '../model/messages';
import {
  buildTimeline,
  ORDER_ACTIONS,
  paymentBreakdown,
  STATUS_LABEL,
  STATUS_TONE,
} from '../model/status';
import { useOrderUpdates } from '../model/use-order-updates';
import { BuyerChatRow } from './buyer-chat-row';
import { OrderItemCard } from './order-item-card';

const CANCELED_TOAST = '주문을 취소했어요';
const NOTE_MAX = 500;

const backToList = () => (router.canGoBack() ? router.back() : router.replace('/orders'));

export function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery(orderDetailQueryOptions(id));
  const cancelSheet = useRef<BottomSheetModal>(null);
  const [note, setNote] = useState('');
  useOrderUpdates();

  const mutation = useMutation({
    mutationFn: (v: { to: OrderStatusType; done: string; note?: string }) =>
      updateOrderStatus({ orderId: id, toStatus: v.to, note: v.note }),
    onSuccess: (_, v) => {
      if (v.to === 'CANCELED') {
        cancelSheet.current?.dismiss();
        setNote('');
      }
      showToast.success(v.done);
    },
    onError: (e) => showToast.error(orderErrorMessage(e)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ordersKeys.all }),
  });

  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="주문 상세" onBack={backToList} />
      {query.data ? (
        <>
          <OrderBody order={query.data} />
          <OrderActionBar
            status={query.data.status}
            busy={mutation.isPending}
            onNext={(next) => mutation.mutate(next)}
            onCancel={() => cancelSheet.current?.present()}
          />
          <ConfirmSheet
            ref={cancelSheet}
            title="주문을 취소할까요?"
            description="구매자에게 취소 사유가 전달되고 결제가 취소돼요"
            confirmLabel="취소 확정"
            confirmDisabled={note.trim() === ''}
            loading={mutation.isPending}
            onConfirm={() =>
              mutation.mutate({ to: 'CANCELED', done: CANCELED_TOAST, note: note.trim() })
            }
          >
            <TextField
              sublabel="취소 사유 (필수)"
              accessibilityLabel="취소 사유"
              placeholder="구매자에게 전달할 사유를 적어 주세요"
              multiline
              maxLength={NOTE_MAX}
              value={note}
              onChangeText={setNote}
            />
          </ConfirmSheet>
        </>
      ) : query.isPending ? (
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

type Order = SellerOrderDetailQuery['sellerOrder'];

function OrderBody({ order }: { order: Order }) {
  const pay = paymentBreakdown(order);
  const call = () =>
    Linking.openURL(`tel:${order.buyerPhone.replace(/[^\d+]/g, '')}`).catch(() =>
      showToast.error('전화를 걸 수 없어요'),
    );
  return (
    <ScrollView contentContainerClassName="px-5 pb-6">
      <Card
        title="주문번호"
        aside={<StatusChip tone={STATUS_TONE[order.status]} label={STATUS_LABEL[order.status]} />}
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

      <SectionHeader title="주문 상품" count={`${order.items.length}건`} />
      <View className="gap-3">
        {order.items.map((item) => (
          <OrderItemCard key={item.id} item={item} />
        ))}
      </View>

      <SectionHeader title="결제 금액" />
      <Card>
        <KeyValue label="상품 금액" value={formatKrw(pay.product)} />
        <KeyValue label="옵션 추가" value={formatSigned(pay.options)} />
        <KeyValue
          label="할인"
          value={pay.discount > 0 ? `-${formatKrw(pay.discount)}` : formatKrw(0)}
        />
        <KeyValue label="총액" value={formatKrw(pay.total)} total />
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
  onCancel,
}: {
  status: OrderStatusType;
  busy: boolean;
  onNext: (next: { to: OrderStatusType; done: string }) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { next, cancellable, notice } = ORDER_ACTIONS[status];
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
  return (
    <ActionBar
      primary={{ title: next.label, loading: busy, onPress: () => onNext(next) }}
      secondary={
        cancellable
          ? { title: '주문 취소', variant: 'dangerOutline', disabled: busy, onPress: onCancel }
          : undefined
      }
    />
  );
}
