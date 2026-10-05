import { type Href, Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

const MENU: { label: string; href: Href }[] = [
  { label: '기본 정보', href: '/store/basic-info' },
  { label: '영업시간', href: '/store/business-hours' },
  { label: '특별휴무', href: '/store/special-closures' },
  { label: '픽업 정책', href: '/store/pickup-policy' },
  { label: '일별 생산 수량', href: '/store/daily-capacities' },
  { label: 'FAQ', href: '/store/faq' },
  { label: '리뷰', href: '/store/reviews' },
  { label: '구매자 화면 미리보기', href: '/store/preview' },
  { label: '조작 이력', href: '/store/audit-logs' },
  { label: '설정', href: '/settings' },
];

/** 매장 탭 — 매장 요약(추후) + 하위 화면 메뉴 */
export function StoreMenuScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-5 py-4">
      <View className="rounded-xl border border-line bg-surface">
        {MENU.map((m, i) => (
          <Link key={m.label} href={m.href} asChild>
            <Pressable
              accessibilityRole="button"
              className={`active:bg-gray-2 h-14 flex-row items-center justify-between px-4 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <Text className="font-sans text-md font-medium text-text">{m.label}</Text>
              <Text className="font-sans text-lg text-chevron">›</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
