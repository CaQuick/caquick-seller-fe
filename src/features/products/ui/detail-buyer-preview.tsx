import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';

import { ApiError } from '@/shared/api';
import { shadow } from '@/shared/config/tokens';
import { formatKrw } from '@/shared/lib/format';
import { AppHeader, Empty, ErrorState, Screen, Segmented, SkeletonRows } from '@/shared/ui';

import { buyerPreviewQueryOptions } from '../api/browse';
import { BROWSE_COPY, priceView } from '../model/browse';
import { DetailGallery } from './detail-gallery';

interface Props {
  productId: string;
  visible: boolean;
  onClose: () => void;
}

/** '구매자 화면으로 보기': 구매자용 상세를 등록 3/3 미리보기 카드(.pv) 모양으로 띄운다 */
export function BuyerPreview({ productId, visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Screen edges={['bottom']} testID="buyer-preview">
        <AppHeader title="구매자 화면" onBack={null} right={{ label: '닫기', onPress: onClose }} />
        {visible ? <PreviewBody productId={productId} /> : null}
      </Screen>
    </Modal>
  );
}

function PreviewBody({ productId }: { productId: string }) {
  const query = useQuery(buyerPreviewQueryOptions(productId));
  const [tab, setTab] = useState<'info' | 'reviews'>('info');

  if (query.isPending) {
    return (
      <View className="px-5">
        <SkeletonRows count={3} card />
      </View>
    );
  }
  if (query.isError) {
    return query.error instanceof ApiError && query.error.classification === 'NOT_FOUND' ? (
      <Empty
        icon="eyeOff"
        title={BROWSE_COPY.buyerHiddenTitle}
        description={BROWSE_COPY.buyerHiddenDescription}
      />
    ) : (
      <ErrorState onRetry={() => void query.refetch()} />
    );
  }

  const { productDetail: p, productReviews } = query.data;
  const { price, original } = priceView(p.regularPrice, p.salePrice);
  return (
    <ScrollView contentContainerClassName="px-5 pb-10">
      <View
        style={shadow.native.card}
        className="mt-6 rounded-2xl bg-surface px-[25px] pb-6 pt-[22px]"
      >
        <DetailGallery urls={p.images} />
        <Text className="mb-[11px] mt-6 font-sans text-xl font-semibold tracking-tight text-ink">
          {p.name}
        </Text>
        {original ? (
          <Text className="font-sans text-md tracking-tight text-text2 line-through">
            {original}
          </Text>
        ) : null}
        <View className="flex-row items-baseline gap-2">
          {p.discountRate > 0 ? (
            <Text className="font-sans text-md font-semibold tracking-tight text-primary-strong">
              {`${p.discountRate}%`}
            </Text>
          ) : null}
          <Text className="font-sans text-lg font-bold tracking-tight text-ink">{price}</Text>
        </View>
        <View className="-mx-[17px] mt-5 h-1.5 bg-line2" />
        <Segmented
          variant="underline"
          items={[
            { value: 'info', label: '상품정보' },
            { value: 'reviews', label: `후기(${productReviews.totalCount})` },
          ]}
          value={tab}
          onChange={setTab}
          className="-mx-[17px]"
        />
        {tab === 'info' ? (
          <>
            {p.description ? <Section title="상품 설명" body={p.description} /> : null}
            {p.purchaseNotice ? <Section title="구매 전 필독사항" body={p.purchaseNotice} /> : null}
            {p.optionGroups.map((g) => (
              <Section
                key={g.id}
                title={g.name}
                body={[
                  g.description,
                  ...g.items.map((item) =>
                    [
                      item.title,
                      item.priceDelta ? ` +${formatKrw(item.priceDelta)}` : '',
                      item.description ? `\n${item.description}` : '',
                    ].join(''),
                  ),
                ]
                  .filter(Boolean)
                  .join('\n')}
              />
            ))}
          </>
        ) : (
          <Text className="mt-6 text-center font-sans text-base tracking-tight text-muted">
            {productReviews.totalCount > 0
              ? `구매자 후기 ${productReviews.totalCount}개는 매장 › 리뷰에서 볼 수 있어요`
              : '아직 후기가 없어요'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View className="mt-6">
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
  );
}
