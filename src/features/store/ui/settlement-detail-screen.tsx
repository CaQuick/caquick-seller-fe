import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { formatCommissionRate, formatDateTime, orderStatusView } from '@/features/orders';
import { type SellerStoreSettlementQuery } from '@/graphql/generated/graphql';
import { ApiError } from '@/shared/api';
import { colors, shadow } from '@/shared/config/tokens';
import { formatKrw } from '@/shared/lib/format';
import { todayKst } from '@/shared/lib/kst';
import { Card, ErrorState, Icon, KeyValue, SectionHeader, StatusChip } from '@/shared/ui';

import { settlementDetailQueryOptions } from '../api/settlement';
import { formatPeriod, SETTLEMENT_COPY, settlementStatusView } from '../model/settlement';
import { QueryGate, SubScreen } from './parts';

type Detail = SellerStoreSettlementQuery['sellerSettlement'];

const backToList = () =>
  router.canGoBack() ? router.back() : router.replace('/store/settlements');
type SettledOrder = Detail['orders'][number];

/** 포함 주문 행: 주문번호·상품 · 기준 금액·수수료(율) / 지급액 · 상태. 누르면 주문 상세 */
function OrderRow({ order }: { order: SettledOrder }) {
  const status = orderStatusView(order.status);
  const title = order.productName ?? order.orderNumber;
  const meta = `${formatKrw(order.settlementBaseAmount)} · 수수료 ${formatKrw(order.commissionAmount)} (${formatCommissionRate(order.commissionRateBps)})`;
  const at = `${formatDateTime(order.settlementFinalizedAt)} 확정`;
  const payout = formatKrw(order.payoutAmount);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, status.label, meta, at, `지급 ${payout}`].join(', ')}
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.orderId } })}
      style={shadow.native.card}
      className="flex-row items-center gap-3 rounded-xl bg-surface p-4"
    >
      <View className="flex-1">
        <Text numberOfLines={1} className="font-sans text-md font-semibold tracking-tight text-ink">
          {title}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 font-sans text-xs tracking-tight text-muted">
          {`${order.orderNumber} · ${at}`}
        </Text>
        <Text className="mt-0.5 font-sans text-xs tracking-tight text-muted">{meta}</Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-sans text-md font-bold tracking-tight text-text">{payout}</Text>
        <StatusChip tone={status.tone} label={status.label} />
      </View>
      <Icon name="chevronRight" size={14} color={colors.chevron} strokeWidth={2.5} />
    </Pressable>
  );
}

function Body({ detail }: { detail: Detail }) {
  const status = settlementStatusView(detail.status);
  const account = detail.paidAccount;
  return (
    <ScrollView contentContainerClassName="px-5 pb-6">
      <Card
        title={formatPeriod(detail.periodStart, detail.periodEnd, todayKst())}
        aside={<StatusChip tone={status.tone} label={status.label} />}
        className="mt-5"
      >
        <KeyValue label="주문 수" value={`${detail.orderCount}건`} />
        <KeyValue label="정산 기준 금액" value={formatKrw(detail.settlementBaseAmount)} />
        <KeyValue
          label="수수료"
          value={
            detail.commissionAmount > 0 ? `-${formatKrw(detail.commissionAmount)}` : formatKrw(0)
          }
        />
        <KeyValue label="정산 금액" value={formatKrw(detail.payoutAmount)} total />
        {detail.paidAt ? (
          <KeyValue label="송금 일시" value={formatDateTime(detail.paidAt)} />
        ) : null}
        {account ? (
          <KeyValue
            label="송금 계좌"
            value={`${account.bank.name} ${account.accountNumberMasked} · ${account.accountHolder}`}
          />
        ) : null}
      </Card>
      <SectionHeader title="포함 주문" count={`${detail.orders.length}건`} />
      <View className="gap-2.5">
        {detail.orders.map((order) => (
          <OrderRow key={order.orderId} order={order} />
        ))}
      </View>
    </ScrollView>
  );
}

/** 주간 정산 1건: 합계·송금 여부·송금 계좌(끝 4자리) + 포함 주문 */
export function StoreSettlementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery(settlementDetailQueryOptions(id));
  const notFound = query.error instanceof ApiError && query.error.classification === 'NOT_FOUND';
  return (
    <SubScreen title="정산 상세">
      {query.data ? (
        <Body detail={query.data} />
      ) : notFound ? (
        <ErrorState title={SETTLEMENT_COPY.notFound} retryLabel="목록으로" onRetry={backToList} />
      ) : (
        <QueryGate
          isPending={query.isPending}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      )}
    </SubScreen>
  );
}
