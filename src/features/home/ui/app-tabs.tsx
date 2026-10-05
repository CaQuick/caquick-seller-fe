import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { type ColorValue, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, fontWeight, size } from '@/shared/config/tokens';
import { Badge, Icon, type IconName } from '@/shared/ui';

import { dashboardQueryOptions } from '../api/home';

const TABS: { name: string; title: string; icon: IconName; header?: string }[] = [
  { name: 'index', title: '홈', icon: 'home' },
  { name: 'orders', title: '주문', icon: 'orders', header: '주문' },
  { name: 'products', title: '상품', icon: 'products', header: '상품' },
  { name: 'chats', title: '채팅', icon: 'chats', header: '채팅' },
  { name: 'store', title: '매장', icon: 'store', header: '매장' },
];

/** 탭 아이콘(.tabbar svg 22·획 2.2). 활성은 라인 + 연보라 채움, 배지는 아이콘 중심에서 오른쪽 6px(.badge-n) */
function TabIcon({
  name,
  color,
  focused,
  badge,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
  badge: number;
}) {
  return (
    <View>
      <Icon
        name={name}
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
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: {
          fontFamily,
          fontWeight: fontWeight.bold,
          fontSize: 18,
          color: colors.text,
        },
        headerTitleAlign: 'left',
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
        return (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              // 홈은 로고·제목을 본문(.home-top)에 그린다
              headerShown: t.header !== undefined,
              headerTitle: t.header,
              tabBarAccessibilityLabel: badge > 0 ? `${t.title}, 답변 필요 ${badge}건` : t.title,
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name={t.icon} color={color} focused={focused} badge={badge} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
