import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { refreshOnce } from '@/shared/api';

import { useSessionStore } from './session-store';

/** 만료 60초 전에 갱신한다 — 첫 요청이 401을 맞고 되돌아오는 왕복을 줄인다 */
export const REFRESH_LEAD_MS = 60_000;

/** 루트 레이아웃 전용. 포그라운드에서만 타이머를 두고, 복귀 시 이미 지났으면 바로 갱신한다 */
export function useProactiveRefresh(): void {
  const expiresAt = useSessionStore((s) => s.expiresAt);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) =>
      setForeground(state !== 'background'),
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!foreground || expiresAt === null) return;
    const id = setTimeout(
      () => void refreshOnce(),
      Math.max(0, expiresAt - REFRESH_LEAD_MS - Date.now()),
    );
    return () => clearTimeout(id);
  }, [foreground, expiresAt]);
}
