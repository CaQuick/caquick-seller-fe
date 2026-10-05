import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, View } from 'react-native';

import { type OrderStatusType } from '@/graphql/generated/graphql';
import { ApiError, messageFor } from '@/shared/api';
import { colors, radius } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { Chip, Empty, ErrorState, Fab, Screen, Skeleton, SkeletonRows } from '@/shared/ui';

import logo from '../../../../assets/images/caquick-logo.png';
import { dashboardQueryOptions, recentOrdersQueryOptions, storeQueryOptions } from '../api/home';
import { homeKeys } from '../api/queryKeys';
import { HOME_COPY, HOME_ORDER_FILTERS, toKpis } from '../model/home';
import { useOrderUpdates } from '../model/use-order-updates';
import { HeroCard } from './hero-card';
import { KpiGrid } from './kpi-grid';
import { RecentOrderRow } from './recent-order-row';

/** 네트워크 오류는 ErrorState 기본 안내, 그 외(권한·매장 없음)는 코드 문구 */
const errorDescription = (error: unknown) =>
  error instanceof ApiError && error.classification === 'NETWORK' ? undefined : messageFor(error);

function StoreMeta() {
  const { data } = useQuery(storeQueryOptions());
  if (!data) return <Skeleton width={120} height={14} />;
  const status = data.isActive ? HOME_COPY.storeActive : HOME_COPY.storeInactive;
  return (
    <View
      accessible
      accessibilityLabel={`${data.storeName}, ${status}`}
      className="flex-row items-center gap-1.5"
    >
      <Text className="font-sans text-sm tracking-tight text-sublabel">{data.storeName}</Text>
      <View className="h-2.5 w-px bg-chip-border" />
      <Text className="font-sans text-sm tracking-tight text-label">{status}</Text>
      <View className={cn('h-2 w-2 rounded-full', data.isActive ? 'bg-mint-text' : 'bg-danger')} />
    </View>
  );
}

function DashboardSection() {
  const { data, error, refetch } = useQuery(dashboardQueryOptions());
  if (data) {
    return (
      <>
        <HeroCard remainingCapacity={data.remainingCapacity ?? null} />
        <KpiGrid kpis={toKpis(data)} />
      </>
    );
  }
  if (error) {
    return <ErrorState description={errorDescription(error)} onRetry={() => void refetch()} />;
  }
  return (
    <View className="px-[18px] pt-6">
      <Skeleton height={191} radius={radius.xl} />
      <View className="mt-[42px] flex-row gap-2.5">
        {[0, 1].map((i) => (
          <View key={i} className="flex-1">
            <Skeleton height={95} radius={radius.xl} />
          </View>
        ))}
      </View>
    </View>
  );
}

function RecentOrders() {
  const [status, setStatus] = useState<OrderStatusType | null>(null);
  const { data, error, refetch } = useQuery(recentOrdersQueryOptions(status));
  let body;
  if (data?.length) {
    body = data.map((order) => <RecentOrderRow key={order.id} order={order} />);
  } else if (data) {
    body = status ? (
      <Empty icon="orders" title={HOME_COPY.noFilteredOrders} />
    ) : (
      <Empty icon="orders" title={HOME_COPY.noOrders} description={HOME_COPY.noOrdersHint} />
    );
  } else if (error) {
    body = <ErrorState description={errorDescription(error)} onRetry={() => void refetch()} />;
  } else {
    body = <SkeletonRows count={3} />;
  }
  return (
    <>
      <Text
        accessibilityRole="header"
        className="px-5 pb-[19px] pt-[38px] font-sans text-3xl font-bold tracking-tight text-text2"
      >
        {HOME_COPY.recentOrders}
      </Text>
      <View className="flex-row gap-2 px-5">
        {HOME_ORDER_FILTERS.map((f) => (
          <Chip
            key={f.label}
            variant="filter"
            label={f.label}
            selected={f.status === status}
            onPress={() => setStatus(f.status)}
          />
        ))}
      </View>
      <View className="gap-2.5 px-5 pt-[22px]">{body}</View>
    </>
  );
}

/** 판매자 홈(Main_Seller, D27~D29) */
export function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  useOrderUpdates();

  // 탭은 언마운트되지 않아 돌아올 때 다시 받는다. 첫 포커스는 마운트 조회와 겹쳐 건너뛴다
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) void queryClient.invalidateQueries({ queryKey: homeKeys.all });
      focusedOnce.current = true;
    }, [queryClient]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: homeKeys.all, type: 'active' });
    setRefreshing(false);
  };

  return (
    <Screen edges={['top']}>
      <ScrollView
        testID="home-scroll"
        contentContainerClassName="pb-[120px]"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primaryStrong}
            colors={[colors.primaryStrong]}
          />
        }
      >
        <View className="px-6 pt-3">
          <Image
            source={logo}
            accessibilityRole="image"
            accessibilityLabel="케이퀵"
            style={{ width: 62, height: 28, marginLeft: -1 }}
          />
          <Text
            accessibilityRole="header"
            className="mt-3 font-sans text-5xl font-bold leading-[31px] tracking-tighter text-text2"
          >
            {HOME_COPY.title}
          </Text>
          <StoreMeta />
        </View>
        <DashboardSection />
        <RecentOrders />
      </ScrollView>
      <Fab
        accessibilityLabel={HOME_COPY.addProduct}
        onPress={() => router.push('/products/new/basic')}
      />
    </Screen>
  );
}
