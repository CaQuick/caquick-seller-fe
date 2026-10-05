import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { ApiError, messageFor } from '@/shared/api';
import { colors, shadow } from '@/shared/config/tokens';
import { formatKrw } from '@/shared/lib/format';
import {
  AppHeader,
  Button,
  Empty,
  ErrorState,
  Icon,
  Screen,
  SectionHeader,
  SkeletonRows,
} from '@/shared/ui';

import { reviewCommentsQueryOptions, reviewDetailQueryOptions } from '../api/reviews';
import { REVIEW_COPY } from '../model/reviews';
import { AuthorRow, ReviewCard } from './review-card';

interface Product {
  productId: string;
  name: string;
  thumbnailUrl?: string | null;
  regularPrice: number;
  salePrice?: number | null;
}

/** 어떤 상품의 리뷰인지(.orow) — 누르면 상품 상세 */
function ProductRow({ product, options }: { product: Product; options: string }) {
  const meta = [options, formatKrw(product.salePrice ?? product.regularPrice)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name} 상품 상세`}
      onPress={() => router.push({ pathname: '/products/[id]', params: { id: product.productId } })}
      style={shadow.native.card}
      className="mt-5 flex-row items-center gap-3 rounded-xl bg-surface px-4 py-3"
    >
      <View className="h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-full bg-gray2">
        {product.thumbnailUrl ? (
          <Image source={{ uri: product.thumbnailUrl }} style={{ width: 50, height: 50 }} />
        ) : (
          <Icon name="products" size={20} color={colors.placeholder} />
        )}
      </View>
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className="font-sans text-lg font-semibold tracking-tight text-text"
        >
          {product.name}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 font-sans text-xs tracking-tight text-muted">
          {meta}
        </Text>
      </View>
      <Icon name="chevronRight" size={16} color={colors.chevron} strokeWidth={2.5} />
    </Pressable>
  );
}

function Comments({ reviewId }: { reviewId: string }) {
  const comments = useInfiniteQuery(reviewCommentsQueryOptions(reviewId));
  const items = comments.data?.pages.flatMap((p) => p.items);
  return (
    <>
      <SectionHeader title="댓글" count={comments.data?.pages[0]?.totalCount ?? ''} />
      {!items ? (
        comments.isError ? (
          <ErrorState
            description={messageFor(comments.error)}
            onRetry={() => void comments.refetch()}
          />
        ) : (
          <SkeletonRows count={2} />
        )
      ) : items.length > 0 ? (
        <View className="gap-2.5">
          {items.map((c) => (
            <View key={c.id} style={shadow.native.card} className="rounded-xl bg-surface p-4">
              <AuthorRow nickname={c.authorNickname} createdAt={c.createdAt} />
              <Text className="mt-2.5 font-sans text-base tracking-tight text-text2">
                {c.content}
              </Text>
            </View>
          ))}
          {comments.hasNextPage ? (
            <Button
              title="댓글 더보기"
              variant="secondary"
              loading={comments.isFetchingNextPage}
              onPress={() => void comments.fetchNextPage()}
            />
          ) : null}
        </View>
      ) : (
        <Text className="py-4 text-center font-sans text-sm tracking-tight text-muted">
          {REVIEW_COPY.noComments}
        </Text>
      )}
    </>
  );
}

/** 리뷰 상세: 상품 요약 · 리뷰 전문 · 댓글(읽기 전용) */
export function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery(reviewDetailQueryOptions(id));
  const d = detail.data;
  const options = d?.review.customOptions.map((o) => o.optionTitle).join(' · ');

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="리뷰 상세" />
      {d ? (
        <ScrollView contentContainerClassName="px-5 pb-6">
          <ProductRow product={d.product} options={options ?? ''} />
          <View className="mt-3">
            <ReviewCard review={d.review} productName={d.product.name} options={options} />
          </View>
          <Comments reviewId={id} />
          <View className="mt-4 rounded-lg bg-tint2 p-3">
            <Text className="font-sans text-sm tracking-tight text-text3">
              {REVIEW_COPY.readOnly}
            </Text>
          </View>
        </ScrollView>
      ) : detail.isError &&
        detail.error instanceof ApiError &&
        detail.error.classification === 'NOT_FOUND' ? (
        <Empty icon="star" title={REVIEW_COPY.notFound} />
      ) : detail.isError ? (
        <ErrorState description={messageFor(detail.error)} onRetry={() => void detail.refetch()} />
      ) : (
        <View className="px-5">
          <SkeletonRows count={3} card />
        </View>
      )}
    </Screen>
  );
}
