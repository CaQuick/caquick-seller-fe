import '../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BootSplash, useProactiveRefresh, useSessionStore } from '@/features/auth';
import { useOtaUpdate } from '@/features/settings';
import { bindOnlineManager, disposeWsClient } from '@/shared/api';
import { colors } from '@/shared/config/tokens';
import { AppToaster } from '@/shared/ui';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// 포그라운드 복귀를 TanStack의 focus로, 기기 네트워크를 online으로 — RN에는 window 이벤트가 없다
bindOnlineManager();
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));

// 세션이 끝나면(로그아웃·강제 해제) 구독 소켓을 끊고 판매자 데이터 캐시를 비운다
useSessionStore.subscribe((s, prev) => {
  if (prev.status !== 'authenticated' || s.status !== 'anonymous') return;
  disposeWsClient();
  queryClient.clear();
});

export default function RootLayout() {
  useProactiveRefresh();
  useOtaUpdate();
  useEffect(() => () => focusManager.setFocused(undefined), []);
  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
          />
          <BootSplash />
          <AppToaster />
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
