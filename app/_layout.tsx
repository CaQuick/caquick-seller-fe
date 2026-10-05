import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/shared/config/tokens';

// Providers(QueryClient·GestureHandlerRoot·BottomSheetModal·Toaster)·세션 부팅·Updates는 auth 기능 PR에서 붙인다
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}
