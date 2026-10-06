import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

/** TanStack의 online 상태를 기기 네트워크에 잇는다 — 끊기면 쿼리를 멈추고 다시 붙으면 재개한다. 앱 부팅 시 1회 */
export function bindOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    // 연결 여부를 모르는 이벤트(isConnected 없음)는 온라인으로 둔다 — 멈춘 채 남지 않게
    const subscription = Network.addNetworkStateListener((state) =>
      setOnline(state.isConnected !== false),
    );
    return () => subscription.remove();
  });
}
