import { Pressable, Text, View } from 'react-native';

import { type SellerOrdersListQuery } from '@/graphql/generated/graphql';
import { colors, shadow } from '@/shared/config/tokens';
import { formatKrw } from '@/shared/lib/format';
import { type YmdDate } from '@/shared/lib/kst';
import { Icon, RemoteImage, StatusChip } from '@/shared/ui';

import { formatPickup } from '../model/format';
import { orderStatusView } from '../model/status';

export type OrderSummary = SellerOrdersListQuery['sellerOrderList']['items'][number];

const CUSTOM_LABEL = '커스텀';

/** 주문 행(.orow): 50 원형 썸네일(커스텀 대표 이미지 우선) · 상품명 · 픽업 일시·주문자 / 금액 · 커스텀·상태 칩 · chevron */
export function OrderRow({
  order,
  today,
  onPress,
}: {
  order: OrderSummary;
  today: YmdDate;
  onPress: () => void;
}) {
  const title = order.firstItemName ?? order.orderNumber;
  const pickup = `${formatPickup(order.pickupAt, today)} 픽업 · ${order.buyerName}`;
  const price = formatKrw(order.totalPrice);
  const status = orderStatusView(order.status);
  const image = order.firstItemCustomImageUrl ?? order.firstItemImageUrl;
  const labels = [title, order.hasCustom && CUSTOM_LABEL, status.label, pickup, price];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={labels.filter(Boolean).join(', ')}
      onPress={onPress}
      style={shadow.native.card}
      className="flex-row items-center gap-3.5 rounded-xl bg-surface py-[17px] pl-4 pr-[19px]"
    >
      {image ? (
        <RemoteImage
          uri={image}
          style={{ width: 50, height: 50 }}
          className="rounded-full bg-gray-bg"
        />
      ) : (
        <View className="h-[50px] w-[50px] items-center justify-center rounded-full bg-gray-bg">
          <Icon name="products" size={22} color={colors.placeholder} />
        </View>
      )}
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className="font-sans text-lg font-semibold leading-5 tracking-tight text-ink"
        >
          {title}
        </Text>
        <Text numberOfLines={1} className="mt-1 font-sans text-xs tracking-tight text-muted">
          {pickup}
        </Text>
        <Text className="mt-1 font-sans text-xs tracking-tight text-muted">{price}</Text>
      </View>
      <View className="items-end gap-1">
        {order.hasCustom ? <StatusChip tone="purple" label={CUSTOM_LABEL} /> : null}
        <StatusChip tone={status.tone} label={status.label} />
      </View>
      <Icon name="chevronRight" size={14} color={colors.chevron} strokeWidth={2.5} />
    </Pressable>
  );
}
