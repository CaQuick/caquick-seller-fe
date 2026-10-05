import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import {
  Button,
  Chip,
  Empty,
  ErrorState,
  Fab,
  SearchBar,
  Segmented,
  SkeletonRows,
} from '@/shared/ui';

import { categoriesQueryOptions, productListQueryOptions } from '../api/browse';
import { BROWSE_COPY, filterChipCategories } from '../model/browse';
import { useDebouncedValue, useSetProductActive } from '../model/use-browse';
import { ProductRow } from './list-row';

type Segment = 'active' | 'hidden';
const SEGMENTS = [
  { value: 'active', label: '판매 중' },
  { value: 'hidden', label: '숨김' },
] as const;

const createProduct = () => router.push('/products/new/basic');

export function ProductsScreen() {
  const [segment, setSegment] = useState<Segment>('active');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText.trim());

  const filter = useMemo(
    () => ({
      isActive: segment === 'active',
      ...(categoryId !== null && { categoryId }),
      ...(search && { search }),
    }),
    [segment, categoryId, search],
  );
  // 필터를 바꾸는 동안 이전 결과를 둬 스켈레톤이 깜빡이지 않게 한다
  const list = useInfiniteQuery({
    ...productListQueryOptions(filter),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    ...categoriesQueryOptions(),
    select: filterChipCategories,
  });
  const setActive = useSetProductActive();

  // 첫 포커스는 마운트 조회와 겹친다
  const focused = useRef(false);
  const { refetch } = list;
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void refetch();
      focused.current = true;
    }, [refetch]),
  );
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), categories.refetch()]);
    setRefreshing(false);
  };

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = categoryId !== null || search !== '';

  const header = (
    <View className="mb-4 mt-4 gap-2.5">
      <Segmented
        items={SEGMENTS}
        value={segment}
        onChange={setSegment}
        accessibilityLabel="노출 상태"
      />
      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        placeholder={BROWSE_COPY.searchPlaceholder}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
        accessibilityLabel="카테고리"
      >
        <Chip
          variant="filter"
          label={BROWSE_COPY.allCategories}
          selected={categoryId === null}
          onPress={() => setCategoryId(null)}
        />
        {categories.data?.map((c) => (
          <Chip
            key={c.id}
            variant="filter"
            label={c.name}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
      </ScrollView>
    </View>
  );

  const empty = list.isPending ? (
    <SkeletonRows count={4} />
  ) : list.isError ? (
    <ErrorState onRetry={() => void refetch()} />
  ) : filtered ? (
    <Empty
      icon="search"
      title={BROWSE_COPY.emptyFilteredTitle}
      description={BROWSE_COPY.emptyFilteredDescription}
    />
  ) : segment === 'hidden' ? (
    <Empty icon="products" title={BROWSE_COPY.emptyHiddenTitle} />
  ) : (
    <Empty
      icon="products"
      title={BROWSE_COPY.emptyTitle}
      description={BROWSE_COPY.emptyDescription}
      action={<Button title={BROWSE_COPY.create} size="sm" onPress={createProduct} />}
    />
  );

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        testID="products-list"
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            onPress={() => router.push({ pathname: '/products/[id]', params: { id: item.id } })}
            onToggleActive={(isActive) => setActive.mutate({ productId: item.id, isActive })}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={list.isFetchingNextPage ? <SkeletonRows count={1} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-[110px]"
      />
      <Fab onPress={createProduct} accessibilityLabel={BROWSE_COPY.create} />
    </View>
  );
}
