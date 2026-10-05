import {
  Accuracy,
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
} from 'expo-location';

import { ApiError } from '@/shared/api';

import { fetchRegionByLocation } from '../api/regions';
import { storeErrorMessage } from './messages';

export const LOCATE_TIMEOUT_MS = 10_000;

export const LOCATION_COPY = {
  find: '현재 위치로 찾기',
  denied: '설정에서 위치 권한을 허용해 주세요',
  openSettings: '설정 열기',
  notFound: '현재 위치의 지역을 찾지 못했어요. 검색으로 선택해 주세요',
  positionFailed: '현재 위치를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요',
} as const;

const CODE_MESSAGE: Record<string, string> = {
  RATE_LIMITED: '요청이 많아요. 잠시 뒤 다시 시도해 주세요',
  LOCATION_LOOKUP_UNAVAILABLE: '지금은 현재 위치로 지역을 찾을 수 없어요. 검색으로 선택해 주세요',
};

export class LocateTimeoutError extends Error {}

export type LocateResult =
  | { status: 'denied' }
  | { status: 'notFound' }
  | { status: 'found'; pick: { name: string; parentName: string } };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new LocateTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** 권한 → 현재 위치 → 지역. 좌표는 이 요청에만 쓰고 저장·기록하지 않는다 */
export async function locateRegion(): Promise<LocateResult> {
  const { granted } = await requestForegroundPermissionsAsync();
  if (!granted) return { status: 'denied' };
  const { coords } = await withTimeout(
    getCurrentPositionAsync({ accuracy: Accuracy.Balanced }),
    LOCATE_TIMEOUT_MS,
  );
  const found = await fetchRegionByLocation(coords.latitude, coords.longitude);
  return found
    ? { status: 'found', pick: { name: found.region.name, parentName: found.group.name } }
    : { status: 'notFound' };
}

/** 기기 위치 실패(타임아웃·위치 서비스 꺼짐)는 ApiError가 아니다 */
export function locateErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return LOCATION_COPY.positionFailed;
  return CODE_MESSAGE[error.code ?? ''] ?? storeErrorMessage(error);
}
