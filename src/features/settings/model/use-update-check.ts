import * as Updates from 'expo-updates';

import { showToast } from '@/shared/ui';

import { SETTINGS_COPY } from './copy';
import { updateRow } from './update-row';

/** 설정의 업데이트 확인 행: 확인 → 있으면 받기 → 받았으면 재시작 */
export function useUpdateCheck() {
  const u = Updates.useUpdates();
  const row = updateRow({
    enabled: !__DEV__ && Updates.isEnabled,
    isChecking: u.isChecking,
    isDownloading: u.isDownloading,
    isUpdateAvailable: u.isUpdateAvailable,
    isUpdatePending: u.isUpdatePending,
    lastCheckedAt: u.lastCheckForUpdateTimeSinceRestart,
  });

  const run = async () => {
    try {
      if (row.action === 'restart') return await Updates.reloadAsync();
      if (row.action === 'check' && !(await Updates.checkForUpdateAsync()).isAvailable) {
        showToast.success(SETTINGS_COPY.upToDate);
        return;
      }
      await Updates.fetchUpdateAsync();
      showToast.info(SETTINGS_COPY.downloaded);
    } catch {
      showToast.error(SETTINGS_COPY.updateFailed);
    }
  };

  return { description: row.description, onPress: row.action ? () => void run() : undefined };
}
