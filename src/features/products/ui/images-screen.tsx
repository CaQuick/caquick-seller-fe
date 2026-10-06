import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import Sortable from 'react-native-sortables';

import { type SellerProductDetailQuery } from '@/graphql/generated/graphql';
import { messageFor } from '@/shared/api';
import { colors, radius } from '@/shared/config/tokens';
import { Icon, showToast } from '@/shared/ui';

import { productDetailQueryOptions } from '../api/browse';
import { addProductImage } from '../api/create';
import { deleteProductImage, reorderProductImages } from '../api/manage';
import { productsKeys } from '../api/queryKeys';
import { MAX_IMAGES } from '../model/draft-form';
import { pickImages, uploadProductImage } from '../model/draft-images';
import { IMAGES_COPY, isReordered, mergeOrder } from '../model/images-order';
import { ManageFrame, ManageGate, useProductId } from './edit-frame';

type Product = SellerProductDetailQuery['sellerProduct'];
type Cell =
  | { kind: 'image'; key: string; url: string }
  | { kind: 'uploading'; key: string; url: string }
  | { kind: 'add'; key: 'add' };

export function ProductImagesScreen() {
  const query = useQuery(productDetailQueryOptions(useProductId()));
  return (
    <ManageGate title={IMAGES_COPY.title} query={query}>
      {(product) => <ImagesBody product={product} />}
    </ManageGate>
  );
}

let seq = 0;

/** 추가·삭제는 즉시, 순서만 '순서 저장'으로 한 번에 보낸다 */
function ImagesBody({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [order, setOrder] = useState<string[]>([]);
  const [uploading, setUploading] = useState<{ key: string; url: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const serverIds = images.map((img) => img.id);
  const ordered = mergeOrder(order, serverIds);
  const reordered = isReordered(ordered, serverIds);
  const total = images.length + uploading.length;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    return queryClient.invalidateQueries({ queryKey: productsKeys.detail(product.id) });
  };

  const add = async () => {
    const picked = await pickImages(MAX_IMAGES - total);
    await Promise.all(
      picked.map(async (image) => {
        const key = `up-${++seq}`;
        setUploading((list) => [...list, { key, url: image.uri }]);
        try {
          await addProductImage(product.id, await uploadProductImage(image));
          await refresh();
        } catch (e) {
          showToast.error(messageFor(e));
        } finally {
          setUploading((list) => list.filter((u) => u.key !== key));
        }
      }),
    );
  };

  const remove = async (imageId: string) => {
    setBusy(imageId);
    try {
      await deleteProductImage(imageId);
      await refresh();
    } catch (e) {
      showToast.error(messageFor(e));
    } finally {
      setBusy(null);
    }
  };

  const saveOrder = async () => {
    setBusy('order');
    try {
      await reorderProductImages(product.id, ordered);
      await refresh();
      showToast.success(IMAGES_COPY.orderSaved);
    } catch (e) {
      showToast.error(messageFor(e));
    } finally {
      setBusy(null);
    }
  };

  const urls = new Map(images.map((img) => [img.id, img.imageUrl]));
  const cells: Cell[] = [
    ...ordered.map((id) => ({ kind: 'image' as const, key: id, url: urls.get(id) ?? '' })),
    ...uploading.map((u) => ({ kind: 'uploading' as const, ...u })),
    ...(total < MAX_IMAGES ? [{ kind: 'add' as const, key: 'add' as const }] : []),
  ];

  return (
    <ManageFrame
      title={IMAGES_COPY.title}
      action={{
        title: IMAGES_COPY.saveOrder,
        disabled: !reordered,
        loading: busy === 'order',
        onPress: () => void saveOrder(),
      }}
    >
      <View className="my-4 rounded-lg bg-tint2 p-3">
        <Text className="font-sans text-sm tracking-tight text-text3">{IMAGES_COPY.guide}</Text>
      </View>
      <Sortable.Grid
        data={cells}
        keyExtractor={(cell) => cell.key}
        columns={2}
        rowGap={10}
        columnGap={10}
        activeItemScale={1.04}
        activeItemShadowOpacity={0.22}
        showDropIndicator
        dropIndicatorStyle={{
          backgroundColor: colors.tint2,
          borderColor: colors.primary,
          borderStyle: 'dashed',
          borderWidth: 1,
          borderRadius: radius.lg,
        }}
        onDragEnd={({ data }) => setOrder(data.flatMap((c) => (c.kind === 'image' ? [c.key] : [])))}
        renderItem={({ item, index }) => {
          if (item.kind === 'add') {
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`이미지 추가 (${total}/${MAX_IMAGES})`}
                onPress={() => void add()}
                className="aspect-square items-center justify-center gap-1.5 rounded-lg border border-dashed border-dash"
              >
                <Icon name="plus" size={22} color={colors.muted} />
                <Text className="font-sans text-xs tracking-tight text-muted">
                  {`추가 (${total}/${MAX_IMAGES})`}
                </Text>
              </Pressable>
            );
          }
          const label = `상품 이미지 ${index + 1}`;
          return (
            <View className="aspect-square overflow-hidden rounded-lg bg-gray2">
              <Image
                accessibilityLabel={label}
                source={{ uri: item.url }}
                className="h-full w-full"
              />
              {item.kind === 'uploading' || busy === item.key ? (
                <View
                  accessibilityLabel={`${label} 처리 중`}
                  className="absolute inset-0 items-center justify-center bg-dim"
                >
                  <ActivityIndicator color={colors.surface} />
                </View>
              ) : null}
              {index === 0 ? (
                <View className="absolute left-1.5 top-1.5 h-5 justify-center rounded-badge bg-tag-dark px-[7px]">
                  <Text className="font-sans text-2xs font-semibold text-surface">
                    {IMAGES_COPY.cover}
                  </Text>
                </View>
              ) : null}
              {item.kind === 'image' && images.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label} 삭제`}
                  disabled={busy != null}
                  onPress={() => void remove(item.key)}
                  hitSlop={11}
                  className="absolute right-1.5 top-1.5 h-[22px] w-[22px] items-center justify-center rounded-badge bg-dim"
                >
                  <Text className="font-sans text-lg leading-[18px] text-surface">×</Text>
                </Pressable>
              ) : null}
              {item.kind === 'image' ? (
                <View className="absolute bottom-1.5 right-1.5 h-[22px] w-[22px] items-center justify-center rounded-badge bg-dim">
                  <Icon name="handle" size={12} color={colors.surface} />
                </View>
              ) : null}
            </View>
          );
        }}
      />
      {images.length === 1 ? (
        <Text className="mt-3 font-sans text-sm tracking-tight text-muted">
          {IMAGES_COPY.lastImage}
        </Text>
      ) : null}
    </ManageFrame>
  );
}
