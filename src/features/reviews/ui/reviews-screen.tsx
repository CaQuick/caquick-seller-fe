import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { useSellerMe } from '@/features/auth';
import { storeRatingQueryOptions } from '@/features/store';
import { messageFor } from '@/shared/api';
import { shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import {
  AppBottomSheet,
  AppHeader,
  Chip,
  Empty,
  ErrorState,
  Screen,
  SectionHeader,
  SkeletonRows,
} from '@/shared/ui';

import { reviewListQueryOptions } from '../api/reviews';
import {
  ratingDistribution,
  REVIEW_COPY,
  type ReviewSortKey,
  SORT_OPTIONS,
  sortLabel,
} from '../model/reviews';
import { ReviewCard } from './review-card';

interface SummaryProps {
  storeId: string;
  /** 최신순 전체 목록에서 불러온 만큼 */
  loaded: readonly { rating: number }[];
  totalCount: number;
  photoTotalCount: number;
}

/** 평점 요약(.pcard): ★ 평균 · 리뷰 수 · 사진 리뷰 수 · 별점 분포(불러온 리뷰 기준) */
function Summary({ storeId, loaded, totalCount, photoTotalCount }: SummaryProps) {
  // 비공개 매장은 NOT_FOUND — 평균만 빼고 그린다
  const rating = useQuery(storeRatingQueryOptions(storeId));
  return (
    <View style={shadow.native.card} className="mt-5 rounded-xl bg-surface p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text
          accessibilityRole="header"
          className="font-sans text-md font-bold tracking-tight text-text2"
        >
          평점 요약
        </Text>
        {rating.data ? (
          <View
            accessible
            accessibilityLabel={`평균 별점 ${rating.data.ratingAverage.toFixed(1)}점`}
            className="flex-row items-center gap-1"
          >
            <Text className="text-6xl text-star">★</Text>
            <Text className="font-sans text-2xl font-semibold text-label">
              {rating.data.ratingAverage.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row justify-between py-[5px]">
        <Text className="font-sans text-base tracking-tight text-muted">{`리뷰 ${totalCount}개`}</Text>
        <Text className="font-sans text-base tracking-tight text-text">
          {`사진 리뷰 ${photoTotalCount}개`}
        </Text>
      </View>
      {ratingDistribution(loaded).map((row) => (
        <View
          key={row.star}
          accessible
          accessibilityLabel={`${row.star}점 ${row.count}개`}
          className="flex-row items-center gap-2 py-[3px]"
        >
          <Text className="w-6 font-sans text-xs text-muted">{`${row.star}점`}</Text>
          <View className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-track2">
            <View className="h-full bg-star" style={{ width: `${row.ratio * 100}%` }} />
          </View>
          <Text className="w-[30px] font-sans text-xs text-muted">{row.count}</Text>
        </View>
      ))}
      <Text className="mt-1 self-end font-sans text-xs tracking-tight text-muted">
        {`최근 ${loaded.length}개 기준`}
      </Text>
    </View>
  );
}

function ReviewList({ storeId }: { storeId: string }) {
  const [photoOnly, setPhotoOnly] = useState(false);
  const [sort, setSort] = useState<ReviewSortKey>('LATEST');
  const sheet = useRef<BottomSheetModal>(null);
  // 요약은 필터와 무관하게 최신순 전체 목록에서 센다(첫 화면과 같은 캐시)
  const latest = useInfiniteQuery(reviewListQueryOptions(storeId, false, 'LATEST'));
  const list = useInfiniteQuery(reviewListQueryOptions(storeId, photoOnly, sort));

  const first = latest.data?.pages[0];
  if (!first) {
    if (latest.isError) {
      return (
        <ErrorState description={messageFor(latest.error)} onRetry={() => void latest.refetch()} />
      );
    }
    return (
      <View className="px-5">
        <SkeletonRows count={3} card />
      </View>
    );
  }
  if (first.totalCount === 0) {
    return (
      <Empty
        icon="star"
        title={REVIEW_COPY.emptyTitle}
        description={REVIEW_COPY.emptyDescription}
      />
    );
  }

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const header = (
    <>
      <Summary
        storeId={storeId}
        loaded={latest.data?.pages.flatMap((p) => p.items) ?? []}
        totalCount={first.totalCount}
        photoTotalCount={first.photoTotalCount}
      />
      <SectionHeader
        title="리뷰"
        count={list.data?.pages[0]?.totalCount ?? ''}
        action={{ label: `${sortLabel(sort)} ›`, onPress: () => sheet.current?.present() }}
      />
      <View className="mb-0.5 flex-row gap-2">
        <Chip
          variant="filter"
          label="전체"
          selected={!photoOnly}
          onPress={() => setPhotoOnly(false)}
        />
        <Chip
          variant="filter"
          label="사진만"
          selected={photoOnly}
          onPress={() => setPhotoOnly(true)}
        />
      </View>
    </>
  );

  return (
    <>
      <FlatList
        testID="reviews-list"
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerClassName="gap-2.5 px-5 pb-6"
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonRows count={2} card />
          ) : list.isError ? (
            <ErrorState description={messageFor(list.error)} onRetry={() => void list.refetch()} />
          ) : (
            <Empty icon="star" title={REVIEW_COPY.photoEmpty} />
          )
        }
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.authorNickname ?? REVIEW_COPY.withdrawn}의 리뷰 상세`}
            onPress={() =>
              router.push({ pathname: '/store/reviews/[id]', params: { id: item.id } })
            }
          >
            <ReviewCard review={item} productName={item.productName} clamp />
          </Pressable>
        )}
      />
      <AppBottomSheet ref={sheet} title="정렬">
        <View accessibilityRole="radiogroup" className="gap-2">
          {SORT_OPTIONS.map((o) => {
            const on = o.value === sort;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityLabel={o.label}
                accessibilityState={{ checked: on }}
                onPress={() => {
                  setSort(o.value);
                  sheet.current?.dismiss();
                }}
                className={cn(
                  'h-12 flex-row items-center gap-2.5 rounded-md border px-3.5',
                  on ? 'border-primary bg-tint2' : 'border-chip-border',
                )}
              >
                <View
                  className={cn(
                    'h-[18px] w-[18px] rounded-full',
                    on ? 'border-[5px] border-primary' : 'border-[1.5px] border-border',
                  )}
                />
                <Text
                  className={cn(
                    'font-sans text-md tracking-tight',
                    on ? 'text-primary' : 'text-text2',
                  )}
                >
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppBottomSheet>
    </>
  );
}

/** 리뷰(읽기 전용): 평점 요약 · 사진 필터 · 정렬 · 카드 목록 */
export function ReviewsScreen() {
  const me = useSellerMe();
  const storeId = me.data?.storeId;
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="리뷰" />
      {storeId ? (
        <ReviewList storeId={storeId} />
      ) : me.isError ? (
        <ErrorState description={messageFor(me.error)} onRetry={() => void me.refetch()} />
      ) : me.isSuccess ? (
        <Empty icon="star" title={REVIEW_COPY.emptyTitle} />
      ) : (
        <View className="px-5">
          <SkeletonRows count={3} card />
        </View>
      )}
    </Screen>
  );
}
