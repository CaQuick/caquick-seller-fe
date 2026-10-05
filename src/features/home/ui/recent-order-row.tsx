import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';

import { type SellerHomeRecentOrdersQuery } from '@/graphql/generated/graphql';
import { colors, shadow } from '@/shared/config/tokens';
import { Icon, StatusChip } from '@/shared/ui';

import { HOME_COPY, ORDER_STATUS_VIEW, pickupLabel } from '../model/home';

type Order = SellerHomeRecentOrdersQuery['sellerOrderList']['items'][number];

/** 주문 행(.orow): 50 원형 썸네일 · 상품명 · 픽업 일시·주문자 · 상태 칩 · chevron */
export function RecentOrderRow({ order }: { order: Order }) {
  const router = useRouter();
  const name = order.firstItemName ?? HOME_COPY.untitledItem;
  const meta = `${pickupLabel(order.pickupAt)} · ${order.buyerName}`;
  const status = ORDER_STATUS_VIEW[order.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${meta}, ${status.label}`}
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
      style={shadow.native.card}
      className="flex-row items-center gap-3.5 rounded-xl bg-surface py-[17px] pl-4 pr-[19px]"
    >
      <View className="h-[50px] w-[50px] overflow-hidden rounded-full bg-gray-bg">
        {order.firstItemImageUrl ? (
          <Image source={{ uri: order.firstItemImageUrl }} style={{ width: 50, height: 50 }} />
        ) : null}
      </View>
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className="font-sans text-lg font-semibold leading-5 tracking-tight text-ink"
        >
          {name}
        </Text>
        <Text numberOfLines={1} className="mt-1 font-sans text-xs tracking-tight text-muted">
          {meta}
        </Text>
      </View>
      <StatusChip tone={status.tone} label={status.label} />
      <Icon name="chevronRight" size={14} color={colors.chevron} strokeWidth={2.5} />
    </Pressable>
  );
}
