import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { type SellerProductManageQuery } from '@/graphql/generated/graphql';

import { productManageQueryOptions } from '../api/manage';
import { OPTIONS_COPY, useLiveOptions } from '../model/options-live';
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

/** 등록 2/3 편집기를 즉시 저장 모드로. 하단 바 대신 상단 안내 박스 */
function OptionsBody({ product }: { product: SellerProductManageQuery['sellerProduct'] }) {
  const { groups, ...handlers } = useLiveOptions(product);
  return (
    <ManageFrame title={OPTIONS_COPY.title}>
      <View className="mt-4 rounded-lg bg-tint2 p-3">
        <Text className="font-sans text-sm tracking-tight text-text3">{OPTIONS_COPY.guide}</Text>
      </View>
      <Text className="mb-4 mt-6 font-sans text-3xl font-bold tracking-tighter text-ink">
        {OPTIONS_COPY.section}
      </Text>
      <OptionsEditor live groups={groups} {...handlers} />
      <Text className="mt-4 font-sans text-sm tracking-tight text-sublabel">
        {OPTIONS_COPY.hint}
      </Text>
    </ManageFrame>
  );
}
