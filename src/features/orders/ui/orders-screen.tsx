import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  View,
} from 'react-native';

import { colors } from '@/shared/config/tokens';
import { todayKst } from '@/shared/lib/kst';
import {
  Button,
  Chip,
  Empty,
  ErrorState,
  SearchBar,
  SectionHeader,
  Segmented,
  SkeletonRows,
} from '@/shared/ui';

import { ordersListQueryOptions } from '../api/orders';
import {
  type DateRange,
  DEFAULT_FILTERS,
  formatRange,
  hasFilters,
  NO_FILTERS,
  type OrderFilters,
  toListVars,
} from '../model/filters';
import { groupByPickupDay } from '../model/sections';
import { STATUS_LABEL, STATUS_SEGMENTS } from '../model/status';
import { useDebouncedValue } from '../model/use-debounced-value';
import { useOrderUpdates } from '../model/use-order-updates';
import { OrderRow } from './order-row';
import { PeriodSheet } from './period-sheet';

const SEARCH_DEBOUNCE_MS = 300;
const ALL = 'ALL';
const SEGMENTS = [
  { value: ALL, label: '전체' },
  ...STATUS_SEGMENTS.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
] as const;

const rangeKey = (r: DateRange | null) => (r ? `${r.from}~${r.to}` : 'none');

export function OrdersScreen() {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const search = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);
  const today = todayKst();
  const vars = toListVars({ ...filters, search });
  const query = useInfiniteQuery(ordersListQueryOptions(vars));
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const [pulling, setPulling] = useState(false);
  const pickupSheet = useRef<BottomSheetModal>(null);
  const createdSheet = useRef<BottomSheetModal>(null);

  useOrderUpdates();
  const { refetch } = query;
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // 첫 포커스는 마운트 조회와 겹친다
      if (focused.current) void refetch();
      focused.current = true;
    }, [refetch]),
  );

  const patch = (next: Partial<OrderFilters>) => setFilters((f) => ({ ...f, ...next }));
  const togglePreset = (preset: 'today' | 'week') =>
    patch({ pickup: filters.pickup === preset ? null : preset });
  const customPickup = typeof filters.pickup === 'object' ? filters.pickup : null;

  const onRefresh = async () => {
    setPulling(true);
    await refetch();
    setPulling(false);
  };

  const header = (
    <View className="px-5">
      <Segmented
        variant="underline"
        scrollable
        accessibilityLabel="주문 상태"
        items={SEGMENTS}
        value={filters.status ?? ALL}
        onChange={(v) => patch({ status: v === ALL ? null : v })}
        className="-mx-5 mt-4"
      />
      <View className="mt-3.5 flex-row flex-wrap gap-2">
        <Chip
          variant="filter"
          label="오늘"
          selected={filters.pickup === 'today'}
          onPress={() => togglePreset('today')}
        />
        <Chip
          variant="filter"
          label="이번 주"
          selected={filters.pickup === 'week'}
          onPress={() => togglePreset('week')}
        />
        <Chip
          variant="filter"
          label={customPickup ? `픽업 ${formatRange(customPickup)}` : '기간 선택'}
          selected={customPickup !== null}
          onPress={() => pickupSheet.current?.present()}
        />
        <Chip
          variant="filter"
          label={filters.created ? `주문일 ${formatRange(filters.created)}` : '주문일 ▾'}
          selected={filters.created !== null}
          onPress={() => createdSheet.current?.present()}
        />
      </View>
      <SearchBar
        value={filters.search}
        onChangeText={(text) => patch({ search: text })}
        placeholder="주문번호·주문자·연락처 검색"
        className="mt-3"
      />
    </View>
  );

  let body;
  if (query.isPending) {
    body = (
      <View className="px-5">
        <SkeletonRows count={4} />
      </View>
    );
  } else if (query.isError && !query.data) {
    body = <ErrorState onRetry={() => void refetch()} />;
  } else if (items.length === 0) {
    const filtered = hasFilters({ ...filters, search });
    body = (
      <ScrollView
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} />}
        contentContainerClassName="pb-6"
      >
        <Empty
          icon="orders"
          title={filtered ? '조건에 맞는 주문이 없어요' : '아직 들어온 주문이 없어요'}
          description={
            filtered
              ? '상태나 픽업일 필터를 바꾸거나\n검색어를 지워 보세요'
              : '주문이 들어오면 여기에 바로 보여요'
          }
          action={
            filtered ? (
              <Button
                title="필터 초기화"
                variant="secondary"
                size="sm"
                onPress={() => setFilters(NO_FILTERS)}
              />
            ) : undefined
          }
        />
      </ScrollView>
    );
  } else {
    body = (
      <SectionList
        testID="orders-list"
        sections={groupByPickupDay(items, today)}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerClassName="px-5 pb-6"
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Text className="pb-1 pt-3.5 text-center font-sans text-xs tracking-tight text-placeholder">
            당겨서 새로고침
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} count={section.count} />
        )}
        renderItem={({ item }) => (
          <OrderRow
            order={item}
            today={today}
            onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator
              accessibilityLabel="더 불러오는 중"
              color={colors.primary}
              className="py-4"
            />
          ) : null
        }
      />
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      {body}
      <PeriodSheet
        key={`pickup-${rangeKey(customPickup)}`}
        ref={pickupSheet}
        title="픽업일 기간"
        value={customPickup}
        today={today}
        onApply={(range) => patch({ pickup: range })}
      />
      <PeriodSheet
        key={`created-${rangeKey(filters.created)}`}
        ref={createdSheet}
        title="주문일 기간"
        value={filters.created}
        today={today}
        onApply={(range) => patch({ created: range })}
      />
    </View>
  );
}
