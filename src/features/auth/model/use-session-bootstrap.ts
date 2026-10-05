import { useQueryClient } from '@tanstack/react-query';
import { SplashScreen } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { sellerMeQueryOptions } from '../api/seller-me';
import { bootstrap, installSessionHooks } from './session';

export type BootPhase = 'loading' | 'offline' | 'ready';

/** 부팅 스플래시 전용. 훅 연결 → 세션 복원·계정 조회, 장애면 offline에서 retry로 다시 돈다 */
export function useSessionBootstrap(): { phase: BootPhase; retry: () => void } {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<BootPhase>('loading');
  // 재시도는 사용자가 고른다 — 장애면 바로 offline으로
  const start = useCallback(
    () =>
      bootstrap(() => queryClient.fetchQuery({ ...sellerMeQueryOptions(), retry: false })).then(
        setPhase,
      ),
    [queryClient],
  );
  useEffect(() => {
    installSessionHooks();
    // 네이티브 스플래시를 내리고 같은 로고의 JS 스플래시가 부팅을 이어받는다
    void SplashScreen.hideAsync();
    void start();
  }, [start]);
  const retry = useCallback(() => {
    setPhase('loading');
    void start();
  }, [start]);
  return { phase, retry };
}
