import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { registerSessionHooks, resetSessionHooks } from '@/shared/api';

import { useSessionStore } from './session-store';
import { REFRESH_LEAD_MS, useProactiveRefresh } from './use-proactive-refresh';

const refresh = jest.fn(() => Promise.resolve(true));

function signIn(expiresInSeconds?: number) {
  useSessionStore.getState().setSession({
    accessToken: 'at',
    mustChangePassword: false,
    expiresInSeconds,
  });
}

/** 훅이 등록한 마지막 AppState 리스너 */
function appState(state: AppStateStatus) {
  const calls = jest.mocked(AppState.addEventListener).mock.calls.filter(([t]) => t === 'change');
  calls.at(-1)![1](state);
}

describe('useProactiveRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    refresh.mockClear();
    registerSessionHooks({ refresh });
    useSessionStore.getState().clear();
  });
  afterEach(() => {
    jest.useRealTimers();
    resetSessionHooks();
  });

  it('만료 60초 전에 refresh하고, 새 만료 시각으로 다시 잡는다', async () => {
    signIn(600);
    await renderHook(() => useProactiveRefresh());
    await act(() => jest.advanceTimersByTime(600_000 - REFRESH_LEAD_MS - 1));
    expect(refresh).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(1));
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(() => signIn(600));
    await act(() => jest.advanceTimersByTime(540_000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('반증: 만료 시각을 모르면(로그아웃·구버전 응답) 타이머를 두지 않는다', async () => {
    signIn(undefined);
    await renderHook(() => useProactiveRefresh());
    await act(() => jest.advanceTimersByTime(3_600_000));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('백그라운드에서는 부르지 않고, 복귀했을 때 이미 지났으면 바로 부른다', async () => {
    signIn(600);
    await renderHook(() => useProactiveRefresh());
    await act(() => appState('background'));
    await act(() => jest.advanceTimersByTime(600_000));
    expect(refresh).not.toHaveBeenCalled();

    await act(() => appState('active'));
    await act(() => jest.advanceTimersByTime(0));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('반증: inactive(알림 센터를 내린 상태)는 포그라운드로 보고 타이머를 유지한다', async () => {
    signIn(120);
    await renderHook(() => useProactiveRefresh());
    await act(() => appState('inactive'));
    await act(() => jest.advanceTimersByTime(60_000));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
