import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import {
  CakeViewer,
  customCatalogQueryOptions,
  SIDE_POSES,
  type YawRequest,
} from '@/features/custom';
import { type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { colors } from '@/shared/config/tokens';
import {
  AppHeader,
  Button,
  Empty,
  ErrorState,
  ImageViewer,
  RemoteImage,
  Screen,
  Segmented,
  SkeletonRows,
} from '@/shared/ui';

import { orderDetailQueryOptions } from '../api/orders';
import { CAPTURE_NOTICE, customGallery, designView, type Gallery } from '../model/custom-view';

type OrderItem = SellerOrderDetailQuery['sellerOrder']['items'][number];
type Mode = 'three' | 'capture';

const MODES = [
  { value: 'three', label: '3D 보기' },
  { value: 'capture', label: '구매자 캡처' },
] as const;

/** 주문 3D 디자인: 직접 돌려 보는 3D와 구매자가 올린 캡처 5장. 3D로 못 그리면 캡처만 */
export function OrderDesignScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId?: string }>();
  const query = useQuery(orderDetailQueryOptions(id));
  const item =
    query.data?.items.find((i) => i.id === itemId) ??
    query.data?.items.find((i) => i.customMode === 'THREE_D');
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: '/orders/[id]', params: { id } });
  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="3D 디자인" onBack={back} />
      {item ? (
        <DesignBody key={item.id} item={item} />
      ) : query.isPending ? (
        <View className="px-5">
          <SkeletonRows count={2} card />
        </View>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <Empty icon="orders" title="3D 디자인이 있는 상품이 아니에요" />
      )}
    </Screen>
  );
}

function DesignBody({ item }: { item: OrderItem }) {
  const catalog = useQuery(customCatalogQueryOptions());
  const [glFailed, setGlFailed] = useState(false);
  // 같은 디자인·카탈로그면 같은 값을 내 텍스처를 다시 그리지 않게 한다
  const view = useMemo(
    () => designView(item.threeDDesign, { data: catalog.data, isError: catalog.isError }, glFailed),
    [item.threeDDesign, catalog.data, catalog.isError, glFailed],
  );
  const [mode, setMode] = useState<Mode>('three');
  const [request, setRequest] = useState<YawRequest>({ yaw: 0 });
  const [viewer, setViewer] = useState<number | null>(null);
  const gallery = customGallery(item);
  const showThree = view.kind !== 'capture' && mode === 'three';
  return (
    <View className="flex-1 px-5">
      <Text className="mt-4 font-sans text-base tracking-tight text-sublabel">
        {item.productName}
      </Text>
      {view.kind === 'capture' ? (
        <Text className="mt-3 rounded-lg bg-tint2 p-3 font-sans text-sm tracking-tight text-text3">
          {CAPTURE_NOTICE[view.reason]}
        </Text>
      ) : (
        <Segmented
          items={MODES}
          value={mode}
          onChange={setMode}
          accessibilityLabel="보기 방식"
          className="mt-3"
        />
      )}
      {!showThree ? (
        <Captures gallery={gallery} onOpen={setViewer} />
      ) : view.kind === 'loading' ? (
        <View className="aspect-square w-full items-center justify-center">
          <ActivityIndicator color={colors.primaryStrong} />
        </View>
      ) : (
        <>
          <View className="mt-4 aspect-square w-full">
            <CakeViewer render={view.render} request={request} onError={() => setGlFailed(true)} />
          </View>
          <View className="mt-4 flex-row gap-2">
            {SIDE_POSES.map((pose) => (
              <Button
                key={pose.kind}
                title={pose.label}
                variant="secondary"
                size="sm"
                className="flex-1"
                onPress={() => setRequest({ yaw: pose.yaw })}
              />
            ))}
          </View>
          <Text className="mt-3 text-center font-sans text-sm tracking-tight text-muted">
            좌우로 끌어 돌려 보세요. 버튼은 구매자 캡처와 같은 방향이에요
          </Text>
        </>
      )}
      <ImageViewer
        images={gallery.uris}
        labels={gallery.labels}
        index={viewer}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

/** 구매자 캡처 가로 넘기기. 누르면 전체 화면 */
function Captures({ gallery, onOpen }: { gallery: Gallery; onOpen: (index: number) => void }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  if (gallery.uris.length === 0) return <Empty icon="orders" title="구매자 캡처가 없어요" />;
  return (
    <View className="mt-4" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <FlatList
        testID="capture-pager"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={gallery.uris}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1)))
        }
        renderItem={({ item: uri, index }) => (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={`${gallery.labels[index]} 크게 보기`}
            onPress={() => onOpen(index)}
            style={{ width, height: width }}
          >
            <RemoteImage uri={uri} className="h-full w-full rounded-xl bg-gray2" />
          </Pressable>
        )}
      />
      <Text className="mt-3 text-center font-sans text-sm tracking-tight text-muted">
        {`${gallery.labels[page]} · ${page + 1}/${gallery.uris.length}`}
      </Text>
    </View>
  );
}
