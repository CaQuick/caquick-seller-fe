import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { type SellerStoreSettlementsQuery } from '@/graphql/generated/graphql';
import { colors, shadow } from '@/shared/config/tokens';
import { formatKrw } from '@/shared/lib/format';
import { todayKst, type YmdDate } from '@/shared/lib/kst';
import { Button, Empty, Icon, StatusChip } from '@/shared/ui';

import { settlementsQueryOptions } from '../api/settlement';
import { formatPeriod, SETTLEMENT_COPY, settlementStatusView } from '../model/settlement';
import { QueryGate, SubScreen } from './parts';

type Settlement = SellerStoreSettlementsQuery['sellerSettlements']['items'][number];

/** 주간 정산 행: 기간 · 건수·수수료 / 정산 금액 · 송금 여부 */
function SettlementRow({ item, today }: { item: Settlement; today: YmdDate }) {
  const period = formatPeriod(item.periodStart, item.periodEnd, today);
  const status = settlementStatusView(item.status);
  const meta = `주문 ${item.orderCount}건 · 수수료 ${formatKrw(item.commissionAmount)}`;
  const payout = formatKrw(item.payoutAmount);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[period, status.label, meta, `정산 금액 ${payout}`].join(', ')}
      onPress={() => router.push({ pathname: '/store/settlements/[id]', params: { id: item.id } })}
      style={shadow.native.card}
      className="flex-row items-center gap-3 rounded-xl bg-surface p-4"
    >
      <View className="flex-1">
        <Text className="font-sans text-md font-semibold tracking-tight text-ink">{period}</Text>
        <Text className="mt-1 font-sans text-xs tracking-tight text-muted">{meta}</Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-sans text-lg font-bold tracking-tight text-text">{payout}</Text>
        <StatusChip tone={status.tone} label={status.label} />
      </View>
      <Icon name="chevronRight" size={14} color={colors.chevron} strokeWidth={2.5} />
    </Pressable>
  );
}

/** 정산 내역: 주간 정산 최근순 키셋 목록 → 포함 주문 */
export function StoreSettlementsScreen() {
  const today = todayKst();
  const list = useInfiniteQuery(settlementsQueryOptions());
  const items = list.data?.pages.flatMap((p) => p.items);
  return (
    <SubScreen title="정산 내역">
      {!items ? (
        <QueryGate
          isPending={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.id}
          contentContainerClassName="gap-2.5 px-5 pb-6 pt-5"
          renderItem={({ item }) => <SettlementRow item={item} today={today} />}
          ListEmptyComponent={
            <Empty
              icon="history"
              title={SETTLEMENT_COPY.emptyTitle}
              description={SETTLEMENT_COPY.emptyDescription}
            />
          }
          ListFooterComponent={
            list.hasNextPage ? (
              <Button
                title={SETTLEMENT_COPY.more}
                variant="secondary"
                className="mt-2.5"
                loading={list.isFetchingNextPage}
                onPress={() => void list.fetchNextPage()}
              />
            ) : null
          }
        />
      )}
    </SubScreen>
  );
}
