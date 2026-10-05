import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, fontWeight, size } from '@/shared/config/tokens';

import { TabIcon, type TabName } from './tab-icons';

const TABS: { name: string; title: string; icon: TabName; header: string }[] = [
  { name: 'index', title: '홈', icon: 'home', header: '판매자 홈' },
  { name: 'orders', title: '주문', icon: 'orders', header: '주문' },
  { name: 'products', title: '상품', icon: 'products', header: '상품' },
  { name: 'chats', title: '채팅', icon: 'chats', header: '채팅' },
  { name: 'store', title: '매장', icon: 'store', header: '매장' },
];

/** 탭 5개. 상세 화면은 탭 안이 아니라 루트 Stack에 둔다(탭 안 중첩 Stack은 iOS Release에서 스플래시가 멈춘다) */
export function AppTabs() {
  const insets = useSafeAreaInsets();
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
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily, fontWeight: fontWeight.medium, fontSize: 11 },
        tabBarStyle: {
          height: size.tabBar + insets.bottom,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            headerTitle: t.header,
            tabBarIcon: ({ color }) => <TabIcon name={t.icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
