import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ApiError } from '@/shared/api';
import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import {
  AppHeader,
  Empty,
  ErrorState,
  Icon,
  Screen,
  Segmented,
  SkeletonRows,
  Stars,
} from '@/shared/ui';

import { myStoreQueryOptions } from '../api/my-store';
import {
  previewProductQueryOptions,
  previewProductsQueryOptions,
  previewQueryOptions,
} from '../api/preview';
import { ALL_CATEGORIES, PREVIEW_COPY, previewTabs, priceText } from '../model/preview';
import { QueryGate, SubScreen } from './parts';

const isNotFound = (e: unknown) => e instanceof ApiError && e.classification === 'NOT_FOUND';

const Hidden = () => (
  <Empty
    icon="eyeOff"
    title={PREVIEW_COPY.hiddenTitle}
    description={PREVIEW_COPY.hiddenDescription}
  />
);

function Photo({
  uri,
  label,
  className,
}: {
  uri?: string | null;
  label: string;
  className: string;
}) {
  return (
    <View className={cn('items-center justify-center overflow-hidden bg-gray2', className)}>
      {uri ? (
        <Image
          accessibilityLabel={label}
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Icon name="products" size={24} color={colors.placeholder} />
      )}
    </View>
  );
}

/** 상품 카드를 누르면 여는 구매자용 상세(읽기 전용) */
function ProductPreview({ productId, onClose }: { productId: string; onClose: () => void }) {
  const product = useQuery(previewProductQueryOptions(productId));
  const p = product.data;
  const price = p && priceText(p.regularPrice, p.salePrice);
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen edges={['bottom']} testID="product-preview">
        <AppHeader
          title="상품 미리보기"
          onBack={null}
          right={{ label: '닫기', onPress: onClose }}
        />
        {p && price ? (
          <ScrollView contentContainerClassName="px-5 pb-10 pt-5">
            <Photo uri={p.images[0]} label={p.name} className="aspect-square w-full rounded-xl" />
            <Text className="mt-5 font-sans text-3xl font-semibold tracking-tight text-ink">
              {p.name}
            </Text>
            {price.original ? (
              <Text className="mt-2 font-sans text-md tracking-tight text-text2 line-through">
                {price.original}
              </Text>
            ) : null}
            <View className="flex-row items-baseline gap-2">
              {p.discountRate > 0 ? (
                <Text className="font-sans text-md font-semibold text-primary-strong">
                  {`${p.discountRate}%`}
                </Text>
              ) : null}
              <Text className="font-sans text-lg font-bold tracking-tight text-ink">
                {price.price}
              </Text>
            </View>
            {[
              ['상품 설명', p.description],
              ['구매 전 필독사항', p.purchaseNotice],
            ].map(([title, body]) =>
              body ? (
                <View key={title} className="mt-6">
                  <Text
                    accessibilityRole="header"
                    className="mb-[11px] font-sans text-md font-semibold tracking-tight text-text3"
                  >
                    {title}
                  </Text>
                  <View className="rounded-lg bg-tint2 p-3">
                    <Text className="font-sans text-sm tracking-tight text-text3">{body}</Text>
                  </View>
                </View>
              ) : null,
            )}
          </ScrollView>
        ) : product.isError && isNotFound(product.error) ? (
          <Empty icon="eyeOff" title={PREVIEW_COPY.productHidden} />
        ) : product.isError ? (
          <ErrorState onRetry={() => void product.refetch()} />
        ) : (
          <View className="px-5">
            <SkeletonRows count={3} card />
          </View>
        )}
      </Screen>
    </Modal>
  );
}

function PreviewBody({ storeId, logoUrl }: { storeId: string; logoUrl?: string | null }) {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState(ALL_CATEGORIES);
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useQuery(previewQueryOptions(storeId));
  const products = useInfiniteQuery({
    ...previewProductsQueryOptions(storeId, tab === ALL_CATEGORIES ? null : tab),
    enabled: detail.isSuccess,
  });

  if (!detail.data) {
    if (detail.isError && isNotFound(detail.error)) return <Hidden />;
    return (
      <QueryGate
        isPending={detail.isPending}
        error={detail.error}
        onRetry={() => void detail.refetch()}
      />
    );
  }

  const store = detail.data.storeDetail;
  const cardWidth = (width - 40 - 10) / 2;
  const items = products.data?.pages.flatMap((page) => page.items.map((i) => i.product)) ?? [];
  const header = (
    <>
      <View className="mt-4 rounded-lg bg-tint2 p-3">
        <Text className="text-center font-sans text-sm font-medium tracking-tight text-text3">
          {PREVIEW_COPY.banner}
        </Text>
      </View>
      <Photo uri={store.images[0]} label="매장 대표 이미지" className="mt-3 h-[170px] rounded-xl" />
      <View className="mt-3 flex-row items-center gap-3.5 px-1 py-3">
        <Photo uri={logoUrl} label="매장 로고" className="h-14 w-14 rounded-xl" />
        <View className="flex-1">
          <Text className="font-sans text-2xl font-bold tracking-tight text-ink">
            {store.storeName}
          </Text>
          <View className="mt-[3px] flex-row items-center gap-1.5">
            <Stars value={store.ratingAverage} />
            <Text className="font-sans text-sm text-label">
              {`${store.ratingAverage.toFixed(1)} (${store.reviewCount})`}
            </Text>
            {store.regionLabel ? (
              <>
                <View className="h-2.5 w-px bg-line" />
                <Text numberOfLines={1} className="shrink font-sans text-sm text-label">
                  {store.regionLabel}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
      <Segmented
        variant="underline"
        scrollable={detail.data.storeProductCategories.length > 2}
        items={previewTabs(detail.data.storeProductCategories)}
        value={tab}
        onChange={setTab}
        accessibilityLabel="카테고리"
      />
      <View className="h-1.5" />
    </>
  );

  return (
    <>
      <FlatList
        testID="preview-products"
        data={items}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerClassName="gap-2.5 px-5 pb-6"
        ListHeaderComponent={header}
        ListEmptyComponent={
          products.isPending ? (
            <SkeletonRows count={2} card />
          ) : products.isError ? (
            <ErrorState onRetry={() => void products.refetch()} />
          ) : (
            <Empty icon="products" title={PREVIEW_COPY.noProducts} />
          )
        }
        onEndReached={() => {
          if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage();
        }}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name} 미리보기`}
            onPress={() => setOpenId(item.id)}
            style={{ width: cardWidth }}
          >
            <Photo uri={item.thumbnailUrl} label={item.name} className="aspect-square rounded-lg" />
            <Text
              numberOfLines={2}
              className="mt-2 font-sans text-base leading-[18px] tracking-tight text-text2"
            >
              {item.name}
            </Text>
            <Text className="mt-0.5 font-sans text-md font-bold tracking-tight text-ink">
              {priceText(item.regularPrice, item.salePrice).price}
            </Text>
          </Pressable>
        )}
      />
      {openId ? <ProductPreview productId={openId} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

/** 구매자 화면 미리보기: 구매자 앱 매장 상세를 읽기 전용으로 */
export function StorePreviewScreen() {
  const store = useQuery(myStoreQueryOptions());
  return (
    <SubScreen title="미리보기">
      {!store.data ? (
        <QueryGate
          isPending={store.isPending}
          error={store.error}
          onRetry={() => void store.refetch()}
        />
      ) : store.data.isActive ? (
        <PreviewBody storeId={store.data.id} logoUrl={store.data.profileImageUrl} />
      ) : (
        <Hidden />
      )}
    </SubScreen>
  );
}
