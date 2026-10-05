import { Pressable, Text, View } from 'react-native';

import { shadow } from '@/shared/config/tokens';
import { RemoteImage, StatusChip, Switch } from '@/shared/ui';

import { type ProductListItem, priceView } from '../model/browse';

interface Props {
  product: ProductListItem;
  onPress: () => void;
  onToggleActive: (isActive: boolean) => void;
}

/** 상품 행(.orow.products-row): 64 r12 썸네일 · 이름·가격·첫 카테고리 · 노출 스위치 */
export function ProductRow({ product, onPress, onToggleActive }: Props) {
  const { price, original } = priceView(product.regularPrice, product.salePrice);
  const thumb = product.images[0]?.imageUrl;
  const category = product.categories[0]?.name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${price}`}
      onPress={onPress}
      style={shadow.native.card}
      className="flex-row items-center gap-3.5 rounded-xl bg-surface py-[17px] pl-4 pr-[19px]"
    >
      <View className="h-16 w-16 overflow-hidden rounded-lg bg-gray2">
        {thumb ? (
          <RemoteImage accessibilityIgnoresInvertColors uri={thumb} className="h-16 w-16" />
        ) : null}
      </View>
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className="font-sans text-lg font-semibold leading-5 tracking-tight text-ink"
        >
          {product.name}
        </Text>
        <View className="mt-[3px] flex-row items-baseline gap-1.5">
          <Text className="font-sans text-lg font-bold tracking-tight text-ink">{price}</Text>
          {original ? (
            <Text className="font-sans text-sm tracking-tight text-muted line-through">
              {original}
            </Text>
          ) : null}
        </View>
        {category ? <StatusChip tone="purple" label={category} className="mt-1" /> : null}
      </View>
      <Switch
        value={product.isActive}
        onValueChange={onToggleActive}
        accessibilityLabel={`${product.name} 노출`}
      />
    </Pressable>
  );
}
