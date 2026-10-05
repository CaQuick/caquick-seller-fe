import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/features/auth';
import { colors, fontFamily, fontWeight } from '@/shared/config/tokens';

/** 세션 가드 + 루트 Stack. 상세 화면은 전부 여기(탭 안 중첩 Stack 금지) */
export default function AppLayout() {
  const status = useSessionStore((s) => s.status);
  const mustChangePassword = useSessionStore((s) => s.mustChangePassword);
  if (status === 'unknown') return null;
  if (status === 'anonymous') return <Redirect href="/login" />;
  if (mustChangePassword) return <Redirect href="/change-password" />;
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontFamily, fontWeight: fontWeight.semibold, color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[id]" options={{ title: '주문 상세' }} />
      <Stack.Screen name="products/new" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id]/index" options={{ title: '상품 상세' }} />
      <Stack.Screen name="products/[id]/edit" options={{ title: '상품 수정' }} />
      <Stack.Screen name="products/[id]/images" options={{ title: '상품 이미지' }} />
      <Stack.Screen name="products/[id]/options" options={{ title: '옵션 편집' }} />
      <Stack.Screen name="products/[id]/custom-template" options={{ title: '커스텀 템플릿' }} />
      <Stack.Screen name="chats/[conversationId]" options={{ title: '대화' }} />
      <Stack.Screen name="store/basic-info" options={{ title: '기본 정보' }} />
      <Stack.Screen name="store/business-hours" options={{ title: '영업시간' }} />
      <Stack.Screen name="store/special-closures" options={{ title: '특별휴무' }} />
      <Stack.Screen name="store/pickup-policy" options={{ title: '픽업 정책' }} />
      <Stack.Screen name="store/daily-capacities" options={{ title: '일별 생산 수량' }} />
      <Stack.Screen name="store/faq/index" options={{ title: 'FAQ' }} />
      <Stack.Screen name="store/faq/[id]" options={{ title: 'FAQ 편집' }} />
      <Stack.Screen name="store/reviews/index" options={{ title: '리뷰' }} />
      <Stack.Screen name="store/reviews/[id]" options={{ title: '리뷰 상세' }} />
      <Stack.Screen name="store/preview" options={{ title: '구매자 화면 미리보기' }} />
      <Stack.Screen name="store/audit-logs" options={{ title: '조작 이력' }} />
      <Stack.Screen name="settings/index" options={{ title: '설정' }} />
      <Stack.Screen name="settings/change-password" options={{ title: '비밀번호 변경' }} />
    </Stack>
  );
}
