import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { customCatalogQueryOptions } from '@/features/custom';
import { type SellerProductManageQuery } from '@/graphql/generated/graphql';
import { ErrorState, SkeletonRows } from '@/shared/ui';

import { productManageQueryOptions } from '../api/manage';
import { OPTIONS_COPY, useLiveOptions } from '../model/options-live';
import { ThreeDPresetBox } from './customization-screen';
import { ManageFrame, ManageGate, useProductId } from './edit-frame';
import { OptionsEditor } from './options-editor';

export function ProductOptionsScreen() {
  const query = useQuery(productManageQueryOptions(useProductId()));
  return (
    <ManageGate title={OPTIONS_COPY.title} query={query}>
      {(product) => <OptionsBody product={product} />}
    </ManageGate>
  );
}

/**
 * 등록 2/3 편집기를 즉시 저장 모드로. 하단 바 대신 상단 안내 박스. 3D 상품이면 선택지마다 3D 항목을 잇는다.
 * 3D 상품은 3D 항목 목록이 와야 편집기를 연다 — 그 전에는 '+ 옵션 추가'가 키 없는 선택지를 만든다
 */
function OptionsBody({ product }: { product: SellerProductManageQuery['sellerProduct'] }) {
  const { groups, ...handlers } = useLiveOptions(product);
  const threeD = product.customMode === 'THREE_D';
  const catalog = useQuery({ ...customCatalogQueryOptions(), enabled: threeD });
  // 꺼진 쿼리도 다른 화면이 채운 캐시를 돌려줘 3D 여부로 한 번 더 거른다
  const choices = threeD ? catalog.data?.optionChoices : undefined;
  return (
    <ManageFrame title={OPTIONS_COPY.title}>
      <View className="mt-4 rounded-lg bg-tint2 p-3">
        <Text className="font-sans text-sm tracking-tight text-text3">{OPTIONS_COPY.guide}</Text>
      </View>
      {threeD ? (
        <>
          <Text className="mt-4 font-sans text-sm tracking-tight text-text3">
            {OPTIONS_COPY.threeDGuide}
          </Text>
          <ThreeDPresetBox productId={product.id} className="mt-2" />
        </>
      ) : null}
      <Text className="mb-4 mt-6 font-sans text-3xl font-bold tracking-tighter text-ink">
        {OPTIONS_COPY.section}
      </Text>
      {threeD && !choices ? (
        catalog.isError ? (
          <ErrorState title={OPTIONS_COPY.catalogError} onRetry={() => void catalog.refetch()} />
        ) : (
          <SkeletonRows count={2} card />
        )
      ) : (
        <OptionsEditor
          live
          groups={groups}
          {...handlers}
          threeD={choices ? { choices } : undefined}
        />
      )}
      <Text className="mt-4 font-sans text-sm tracking-tight text-sublabel">
        {OPTIONS_COPY.hint}
      </Text>
    </ManageFrame>
  );
}
