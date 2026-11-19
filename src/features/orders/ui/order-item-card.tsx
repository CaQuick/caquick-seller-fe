import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { colors } from '@/shared/config/tokens';
import { formatCount } from '@/shared/lib/format';
import { Card, Icon, ImageThumb, ImageViewer, KeyValue, RemoteImage } from '@/shared/ui';

import {
  areaStyle,
  customGallery,
  customPreview,
  type Gallery,
  slotTextValue,
} from '../model/custom-view';
import { formatSigned } from '../model/format';

type OrderItem = SellerOrderDetailQuery['sellerOrder']['items'][number];

const bySort = <T extends { sortOrder: number }>(list: readonly T[]) =>
  [...list].sort((a, b) => a.sortOrder - b.sortOrder);

function SubLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-3.5 font-sans text-sm tracking-tight text-sublabel">{children}</Text>
  );
}

/** 누르면 전체 화면으로 여는 이미지 */
function ZoomImage({
  uri,
  label,
  onPress,
  className,
}: {
  uri: string;
  label: string;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={`${label} 크게 보기`}
      onPress={onPress}
      className={className}
    >
      <RemoteImage uri={uri} className="h-full w-full rounded-lg bg-gray2" />
    </Pressable>
  );
}

/** 품목 카드: 상품·수량 → 선택 옵션 → 커스텀(3D·합성 이미지·문구) → 자유 편집 영역·요청 사항·참고 사진 */
export function OrderItemCard({ orderId, item }: { orderId: string; item: OrderItem }) {
  const [viewer, setViewer] = useState<{ gallery: Gallery; index: number } | null>(null);
  const gallery = customGallery(item);
  const preview = customPreview(item);
  const showPreview = (uri: string) =>
    setViewer(
      gallery.uris.includes(uri)
        ? { gallery, index: gallery.uris.indexOf(uri) }
        : { gallery: { uris: [uri], labels: ['커스텀 이미지'] }, index: 0 },
    );
  const edits = bySort(item.freeEdits);
  return (
    <Card>
      <View className="flex-row items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-sm bg-gray-bg">
          <Icon name="products" size={18} color={colors.placeholder} />
        </View>
        <Text className="flex-1 font-sans text-base tracking-tight text-text">
          {item.productName}
        </Text>
        <Text className="font-sans text-sm tracking-tight text-muted">
          {formatCount(item.quantity, '개')}
        </Text>
      </View>
      {item.optionItems.length > 0 ? (
        <>
          <SubLabel>선택 옵션</SubLabel>
          {item.optionItems.map((o) => (
            <KeyValue
              key={o.id}
              label={o.groupName}
              value={`${o.optionTitle} (${formatSigned(o.priceDelta)})`}
            />
          ))}
        </>
      ) : null}
      {item.customMode === 'THREE_D' ? (
        <>
          <SubLabel>3D 디자인</SubLabel>
          <View className="flex-row items-center gap-3.5">
            {preview ? (
              <ZoomImage
                uri={preview}
                label="3D 윗면"
                onPress={() => showPreview(preview)}
                className="h-24 w-24"
              />
            ) : null}
            <Pressable
              accessibilityRole="link"
              onPress={() =>
                router.push({
                  pathname: '/orders/[id]/design',
                  params: { id: orderId, itemId: item.id },
                })
              }
              hitSlop={8}
            >
              <Text className="font-sans text-base font-semibold tracking-tight text-primary">
                3D로 돌려 보기 ›
              </Text>
            </Pressable>
          </View>
        </>
      ) : preview ? (
        <>
          <SubLabel>커스텀 이미지</SubLabel>
          <ZoomImage
            uri={preview}
            label="커스텀 이미지"
            onPress={() => showPreview(preview)}
            className="aspect-square w-full"
          />
        </>
      ) : null}
      {item.customTexts.length > 0 ? (
        <>
          <SubLabel>커스텀 문구</SubLabel>
          {bySort(item.customTexts).map((t) => (
            <KeyValue key={t.id} label={t.label} value={slotTextValue(t)} />
          ))}
        </>
      ) : null}
      {edits.length > 0 && item.customBaseImageUrl ? (
        <>
          <SubLabel>자유 편집 영역</SubLabel>
          <View className="aspect-square w-full overflow-hidden rounded-lg bg-gray2">
            <RemoteImage uri={item.customBaseImageUrl} className="h-full w-full" />
            {edits.map((edit, i) => (
              <View
                key={edit.id}
                accessibilityLabel={`자유 편집 영역 ${i + 1}`}
                style={areaStyle(edit)}
                className="absolute rounded-xs border-2 border-primary"
              >
                <Text className="absolute left-0 top-0 min-w-5 rounded-br-xs bg-primary px-1 text-center font-sans text-2xs font-semibold text-surface">
                  {String(i + 1)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      {edits.map((edit, i) => {
        const n = edits.length > 1 ? ` ${i + 1}` : '';
        const photos = bySort(edit.attachments).map((a) => a.imageUrl);
        const labels = photos.map((_, j) => `참고 사진${n}-${j + 1}`);
        return (
          <Fragment key={edit.id}>
            {edit.descriptionText ? (
              <>
                <SubLabel>{`요청 사항${n}`}</SubLabel>
                <View className="rounded-lg bg-tint2 p-3">
                  <Text className="font-sans text-sm tracking-tight text-text3">
                    {edit.descriptionText}
                  </Text>
                </View>
              </>
            ) : null}
            {photos.length > 0 ? (
              <>
                <SubLabel>{`참고 사진${n}`}</SubLabel>
                <View className="flex-row flex-wrap gap-2.5">
                  {photos.map((uri, j) => (
                    <Pressable
                      key={`${uri}-${j}`}
                      accessibilityRole="imagebutton"
                      accessibilityLabel={`${labels[j]} 크게 보기`}
                      onPress={() => setViewer({ gallery: { uris: photos, labels }, index: j })}
                    >
                      <ImageThumb uri={uri} label={labels[j]!} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </Fragment>
        );
      })}
      <ImageViewer
        images={viewer?.gallery.uris ?? []}
        labels={viewer?.gallery.labels}
        index={viewer?.index ?? null}
        onClose={() => setViewer(null)}
      />
    </Card>
  );
}
