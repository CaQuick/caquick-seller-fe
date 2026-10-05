import { onlineManager } from '@tanstack/react-query';
import { type NetworkStateEvent, addNetworkStateListener } from 'expo-network';

import { bindOnlineManager } from './online';

const subscribe = jest.mocked(addNetworkStateListener);

function emit(state: NetworkStateEvent) {
  subscribe.mock.calls.at(-1)![0](state);
}

describe('bindOnlineManager', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('기기 네트워크 상태를 TanStack online으로 넘긴다', () => {
    bindOnlineManager();
    emit({ isConnected: false, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
    emit({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('반증: 연결 여부를 모르는 이벤트는 오프라인으로 바꾸지 않는다', () => {
    bindOnlineManager();
    emit({});
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('리스너를 바꾸면 이전 네트워크 구독을 푼다', () => {
    bindOnlineManager();
    const { remove } = subscribe.mock.results.at(-1)!.value as { remove: jest.Mock };
    onlineManager.setEventListener(() => undefined);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
