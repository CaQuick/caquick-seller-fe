import * as Updates from 'expo-updates';
import { useEffect } from 'react';

/** 앱 시작 시 OTA 1회 확인. dev client·업데이트 비활성 빌드는 건너뛴다 */
export function useOtaUpdate(): void {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    void (async () => {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      if (!isAvailable) return;
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    })().catch(() => {
      // 다음 실행에서 다시 시도한다
    });
  }, []);
}
