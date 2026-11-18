import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { colors } from '@/shared/config/tokens';
import { formatCount } from '@/shared/lib/format';
import { Card, Icon, ImageThumb, KeyValue } from '@/shared/ui';

import { formatSigned } from '../model/format';

type OrderItem = SellerOrderDetailQuery['sellerOrder']['items'][number];

const bySort = <T extends { sortOrder: number }>(list: readonly T[]) =>
  [...list].sort((a, b) => a.sortOrder - b.sortOrder);

/** null은 구매자가 선택 자리를 비운 것이라 기본 문구로 채우지 않는다 */
const customTextValue = (t: OrderItem['customTexts'][number]) =>
  t.valueText === null ? '문구 없음' : t.valueText || t.defaultText;

function SubLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-3.5 font-sans text-sm tracking-tight text-sublabel">{children}</Text>
  );
}

/** 품목 카드: 상품·수량 → 선택 옵션 → 커스텀 문구 → 자유 편집 이미지·요청 사항 */
export function OrderItemCard({ item }: { item: OrderItem }) {
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
      {item.customTexts.length > 0 ? (
        <>
          <SubLabel>커스텀 문구</SubLabel>
          {bySort(item.customTexts).map((t) => (
            <KeyValue key={t.id} label={t.tokenKey} value={customTextValue(t)} />
          ))}
        </>
      ) : null}
      {edits.map((edit, i) => {
        const n = edits.length > 1 ? ` ${i + 1}` : '';
        const images = bySort(edit.attachments).map((a) => a.imageUrl);
        return (
          <Fragment key={edit.id}>
            {images.length > 0 ? (
              <>
                <SubLabel>{`자유 편집 이미지${n}`}</SubLabel>
                <View className="flex-row flex-wrap gap-2.5">
                  {images.map((uri, j) => (
                    <ImageThumb
                      key={`${uri}-${j}`}
                      uri={uri}
                      label={`자유 편집 이미지${n}-${j + 1}`}
                    />
                  ))}
                </View>
              </>
            ) : null}
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
          </Fragment>
        );
      })}
    </Card>
  );
}
