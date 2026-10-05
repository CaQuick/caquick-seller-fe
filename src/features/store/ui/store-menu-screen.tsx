import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors, shadow } from '@/shared/config/tokens';
import { formatYmd, todayKst } from '@/shared/lib/kst';
import { Icon, MenuGroup, MenuRow, RemoteImage, SectionHeader, Stars } from '@/shared/ui';

import {
  faqTopicsQueryOptions,
  myStoreQueryOptions,
  storeRatingQueryOptions,
} from '../api/my-store';
import {
  businessHoursQueryOptions,
  dailyCapacitiesQueryOptions,
  specialClosuresQueryOptions,
} from '../api/schedule';
import { regionLabel, toBasicInfoValues } from '../model/basic-info';
import {
  closuresSummary,
  faqSummary,
  pickupPolicySummary,
  summarizeBusinessHours,
  upcomingClosures,
} from '../model/summaries';
import { monthDateRange, monthKey } from '../model/time';
import { QueryGate } from './parts';

const go = (href: Href) => () => router.push(href);

interface ProfileProps {
  store: {
    storeName: string;
    addressFull: string;
    profileImageUrl?: string | null;
    isActive: boolean;
    region: string | null;
  };
  rating?: { ratingAverage: number; reviewCount: number };
}

/** 프로필 카드(.profile.store-profile): 로고 56 r16 · 이름 18/700 · 주소 · 평점 · 구매자 화면 링크 */
function ProfileCard({ store, rating }: ProfileProps) {
  return (
    <View style={shadow.native.card} className="mt-4 flex-row gap-3.5 rounded-xl bg-surface p-4">
      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gray2">
        {store.profileImageUrl ? (
          <RemoteImage
            accessibilityLabel="매장 로고"
            uri={store.profileImageUrl}
            style={{ width: 56, height: 56 }}
          />
        ) : (
          <Icon name="store" size={24} color={colors.placeholder} />
        )}
      </View>
      <View className="flex-1">
        <Text className="font-sans text-2xl font-bold tracking-tight text-ink">
          {store.storeName}
        </Text>
        <Text numberOfLines={1} className="mt-[3px] font-sans text-sm tracking-tight text-label">
          {store.region ?? store.addressFull}
        </Text>
        {!store.isActive ? (
          <Text className="mt-[3px] font-sans text-sm tracking-tight text-muted">비공개 매장</Text>
        ) : rating ? (
          <View className="mt-[3px] flex-row items-center gap-1.5">
            <Stars value={rating.ratingAverage} />
            <Text className="font-sans text-sm text-label">{rating.ratingAverage.toFixed(1)}</Text>
            <View className="h-2.5 w-px bg-line" />
            <Text className="font-sans text-sm text-label">{`리뷰 ${rating.reviewCount}`}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="구매자 화면 보기"
          onPress={go('/store/preview')}
          hitSlop={12}
          className="mt-2.5 self-start"
        >
          <Text className="font-sans text-sm font-medium tracking-tight text-primary-strong">
            구매자 화면 보기 ›
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** 매장 탭: 프로필 카드 + 설정 메뉴. 보조 문구는 각 설정의 현재 값 요약 */
export function StoreMenuScreen() {
  const today = todayKst();
  const month = { y: today.y, m: today.m };
  const store = useQuery(myStoreQueryOptions());
  const rating = useQuery({
    ...storeRatingQueryOptions(store.data?.id ?? ''),
    enabled: store.data?.isActive === true,
  });
  const hours = useQuery(businessHoursQueryOptions());
  const closures = useInfiniteQuery(specialClosuresQueryOptions());
  const faq = useQuery(faqTopicsQueryOptions());
  const capacities = useQuery(dailyCapacitiesQueryOptions(monthKey(month), monthDateRange(month)));

  const closureItems = closures.data?.pages.flatMap((p) => p.items);
  const capacityCount = capacities.data?.totalCount;
  const r = rating.data;
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-5 pb-6">
      {store.data ? (
        <ProfileCard
          store={{ ...store.data, region: regionLabel(toBasicInfoValues(store.data).region) }}
          rating={r}
        />
      ) : (
        <QueryGate
          isPending={store.isPending}
          error={store.error}
          onRetry={() => void store.refetch()}
        />
      )}
      <SectionHeader title="매장 설정" />
      <MenuGroup>
        <MenuRow
          icon="store"
          title="기본 정보"
          description="로고·연락처·주소·인사말"
          onPress={go('/store/basic-info')}
        />
        <MenuRow
          icon="clock"
          title="영업시간"
          description={hours.data && summarizeBusinessHours(hours.data)}
          onPress={go('/store/business-hours')}
        />
        <MenuRow
          icon="closure"
          title="특별휴무"
          description={
            closureItems && closuresSummary(upcomingClosures(closureItems, formatYmd(today)))
          }
          onPress={go('/store/special-closures')}
        />
        <MenuRow
          icon="pickup"
          title="픽업 정책"
          description={store.data && pickupPolicySummary(store.data)}
          onPress={go('/store/pickup-policy')}
        />
        <MenuRow
          icon="capacity"
          title="일별 생산 수량"
          description={
            capacityCount === undefined
              ? undefined
              : capacityCount > 0
                ? `이번 달 조정 ${capacityCount}일`
                : '이번 달 조정한 날 없음'
          }
          onPress={go('/store/daily-capacities')}
        />
        <MenuRow
          icon="autoReply"
          title="자동응답(FAQ)"
          description={faq.data && faqSummary(faq.data)}
          onPress={go('/store/faq')}
        />
      </MenuGroup>
      <SectionHeader title="고객" />
      <MenuGroup>
        <MenuRow
          icon="star"
          title="리뷰"
          description={r ? `★ ${r.ratingAverage.toFixed(1)} · ${r.reviewCount}개` : '구매자 리뷰'}
          onPress={go('/store/reviews')}
        />
        <MenuRow
          icon="history"
          title="조작 이력"
          description="매장·상품·주문 변경 기록"
          onPress={go('/store/audit-logs')}
        />
      </MenuGroup>
      <SectionHeader title="계정" />
      <MenuGroup>
        <MenuRow
          icon="settings"
          title="설정"
          description="알림 · 비밀번호 · 로그아웃"
          onPress={go('/settings')}
        />
      </MenuGroup>
    </ScrollView>
  );
}
