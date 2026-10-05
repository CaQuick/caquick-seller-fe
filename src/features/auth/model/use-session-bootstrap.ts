import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';

import { bootstrap, installSessionHooks } from './session';
import { useSessionStore } from './session-store';

/** 루트 레이아웃 전용. 훅 연결 → 세션 복원, 상태가 확정되면 스플래시를 내린다 */
export function useSessionBootstrap(): void {
  const status = useSessionStore((s) => s.status);
  useEffect(() => {
    installSessionHooks();
    void bootstrap();
  }, []);
  useEffect(() => {
    if (status !== 'unknown') void SplashScreen.hideAsync();
  }, [status]);
}
