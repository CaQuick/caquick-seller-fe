import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { showToast } from '@/shared/ui';

import { registerPushToken, unregisterPushToken } from '../api/push-token';
import { PUSH_COPY } from './copy';

/** BE가 같은 id로 보낸다(seller-push-messages.helper) */
export const ANDROID_CHANNEL_ID = 'default';

let registered: string | null = null;
let inflight: Promise<string | null> | null = null;

const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
  Constants.easConfig?.projectId;

async function register(prompt: boolean): Promise<string | null> {
  // Android 13+는 채널이 있어야 권한 팝업이 뜬다
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: PUSH_COPY.channelName,
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && prompt && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) showToast.info(PUSH_COPY.denied);
  }
  if (!permission.granted) return null;
  const id = projectId();
  if (!id) {
    console.warn('[push] EAS projectId가 없어 푸시 토큰 등록을 건너뜁니다');
    return null;
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await registerPushToken(token, Platform.OS === 'ios' ? 'IOS' : 'ANDROID');
  registered = token;
  return token;
}

/**
 * 채널 → 권한 → Expo 토큰 → BE 등록. 로그인·앱 시작마다 부르고, 겹친 호출은 하나로 합친다.
 * prompt는 로그인 직후에만 — 앱 시작 때는 권한 팝업을 띄우지 않는다
 */
export function ensurePushToken({ prompt }: { prompt: boolean }): Promise<string | null> {
  inflight ??= register(prompt).finally(() => {
    inflight = null;
  });
  return inflight;
}

export const hasPushToken = () => registered !== null;

/**
 * 진행 중인 등록을 기다린 뒤 토큰을 잊는다. notify면 서버에서도 해제한다 — 실패는 호출자(logout)가 삼킨다.
 * 서버가 막는 세션(비밀번호 변경 강제·이미 끝난 세션)은 notify 없이 잊기만 하고 서버 쪽 정리는 BE에 맡긴다
 */
export async function releasePushToken({ notify = true } = {}): Promise<void> {
  await inflight?.catch(() => null);
  const token = registered;
  registered = null;
  if (token && notify) await unregisterPushToken(token);
}
