import { formatRelativeKst } from '@/shared/lib/kst';

import { SETTINGS_COPY } from './copy';

export interface UpdateSnapshot {
  /** dev client·업데이트가 꺼진 빌드는 false */
  enabled: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  lastCheckedAt?: Date;
}

export type UpdateAction = 'check' | 'download' | 'restart';

/** 업데이트 확인 행의 설명과 눌렀을 때 할 일. 진행 중이면 누를 수 없다 */
export function updateRow(
  u: UpdateSnapshot,
  now = new Date(),
): { description: string; action: UpdateAction | null } {
  if (!u.enabled) return { description: SETTINGS_COPY.updateDisabled, action: null };
  if (u.isChecking) return { description: SETTINGS_COPY.updateChecking, action: null };
  if (u.isDownloading) return { description: SETTINGS_COPY.updateDownloading, action: null };
  if (u.isUpdatePending) return { description: SETTINGS_COPY.updatePending, action: 'restart' };
  if (u.isUpdateAvailable)
    return { description: SETTINGS_COPY.updateAvailable, action: 'download' };
  return {
    description: u.lastCheckedAt
      ? SETTINGS_COPY.lastChecked(formatRelativeKst(u.lastCheckedAt.toISOString(), now))
      : SETTINGS_COPY.updateNever,
    action: 'check',
  };
}
