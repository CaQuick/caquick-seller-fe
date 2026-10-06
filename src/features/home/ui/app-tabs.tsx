import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { type ColorValue, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, fontWeight, size } from '@/shared/config/tokens';
import { AppHeader, Badge, Icon, type IconName } from '@/shared/ui';

import { dashboardQueryOptions } from '../api/home';

interface Tab {
  name: string;
  title: string;
  icon: IconName;
  activeIcon?: IconName;
  /** 목록 탭은 가운데 제목(.hdr), 매장은 홈처럼 왼쪽 큰 제목(.home-top). 홈은 본문이 그린다 */
  header?: 'center' | 'large';
}

const TABS: Tab[] = [
  { name: 'index', title: '홈', icon: 'home', activeIcon: 'homeActive' },
  { name: 'orders', title: '주문', icon: 'orders', header: 'center' },
  { name: 'products', title: '상품', icon: 'products', header: 'center' },
  { name: 'chats', title: '채팅', icon: 'chats', header: 'center' },
  { name: 'store', title: '매장', icon: 'store', header: 'large' },
];

function TabHeader({ title, variant }: { title: string; variant: 'center' | 'large' }) {
  const insets = useSafeAreaInsets();
  return (
    <View testID="tab-header" style={{ paddingTop: insets.top }} className="bg-bg">
      {variant === 'center' ? (
        <AppHeader title={title} onBack={null} />
      ) : (
        <Text
          accessibilityRole="header"
          className="px-6 pt-6 font-sans text-5xl font-bold leading-[31px] tracking-tighter text-text2"
        >
          {title}
        </Text>
      )}
    </View>
  );
}

/** 탭 아이콘(.tabbar svg 22·획 2.2). 활성은 라인 + 연보라 채움(홈은 전용 채움 아이콘), 배지는 아이콘 중심에서 오른쪽 6px(.badge-n) */
function TabIcon({
  tab,
  color,
  focused,
  badge,
}: {
  tab: Tab;
  color: ColorValue;
  focused: boolean;
  badge: number;
}) {
  return (
    <View>
      <Icon
        testID={`tab-icon-${tab.name}`}
        name={focused && tab.activeIcon ? tab.activeIcon : tab.icon}
        size={22}
        color={color}
        strokeWidth={2.2}
        fill={focused ? colors.tint : undefined}
      />
      <Badge count={badge} className="absolute -top-1 left-[17px]" />
    </View>
  );
}

/** 탭 5개(D27). 상세 화면은 탭 안이 아니라 루트 Stack에 둔다(탭 안 중첩 Stack은 iOS Release에서 스플래시가 멈춘다) */
export function AppTabs() {
  const insets = useSafeAreaInsets();
  const { data } = useQuery(dashboardQueryOptions());
  const unanswered = data?.unansweredConversationCount ?? 0;
  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: colors.text2,
        tabBarLabelStyle: {
          fontFamily,
          fontWeight: fontWeight.medium,
          fontSize: 12,
          lineHeight: 15,
          marginTop: 6,
        },
        tabBarStyle: {
          height: size.tabBar + insets.bottom,
          paddingTop: 10,
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
      }}
    >
      {TABS.map((t) => {
        const badge = t.name === 'chats' ? unanswered : 0;
        const { header } = t;
        return (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              headerShown: header !== undefined,
              header: header && (() => <TabHeader title={t.title} variant={header} />),
              tabBarAccessibilityLabel: badge > 0 ? `${t.title}, 답변 필요 ${badge}건` : t.title,
              tabBarIcon: ({ color, focused }) => (
                <TabIcon tab={t} color={color} focused={focused} badge={badge} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
