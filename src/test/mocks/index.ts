/**
 * jest setupFiles — 네이티브 모듈 페이크. jest-expo가 비워 두는 것만 채운다.
 * 정상 경로의 네트워크는 MSW(setup.ts)로 흉내 내고, 여기서는 기기 저장소·푸시·업데이트·파일만 가짜로 둔다.
 * jest.mock 팩토리가 참조하는 변수는 mock 접두가 필요하다.
 */
import 'react-native-gesture-handler/jestSetup';

// .env.test가 없으므로 번들 시점 값과 같은 모양으로 주입(babel-jest는 inlining하지 않는다)
process.env.EXPO_PUBLIC_API_BASE_URL ??= 'http://localhost:4100';
process.env.EXPO_PUBLIC_WS_URL ??= 'ws://localhost:4100/graphql';

/** expo-secure-store: 프로세스 안 Map. setup.ts의 afterEach가 비운다 */
export const mockSecureStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockSecureStore.delete(key);
    return Promise.resolve();
  }),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}));

jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', granted: true })),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ type: 'expo', data: 'ExponentPushToken[test]' }),
  ),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
}));

/** expo-network: jest-expo 자동 mock은 구독 객체를 돌려주지 않는다 — onlineManager 해제가 remove를 부른다 */
jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-updates', () => ({
  useUpdates: jest.fn(() => ({
    isUpdateAvailable: false,
    isUpdatePending: false,
    isChecking: false,
    isDownloading: false,
    currentlyRunning: { isEmbeddedLaunch: true, runtimeVersion: 'test' },
  })),
  checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(() => Promise.resolve({ isNew: false })),
  reloadAsync: jest.fn(() => Promise.resolve()),
  isEnabled: false,
}));

/** expo-file-system 신 API의 File: size와 upload만. 업로드 호출을 기록해 spec이 단언한다 */
export const mockUploads: { uri: string; url: string; options: unknown }[] = [];
export const mockFileSizes = new Map<string, number>();
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get size() {
      return mockFileSizes.get(this.uri) ?? 0;
    }
    get exists() {
      return mockFileSizes.has(this.uri);
    }
    upload(url: string, options: unknown) {
      mockUploads.push({ uri: this.uri, url, options });
      return Promise.resolve({ status: 200, headers: {}, body: '' });
    }
  }
  return {
    File,
    UploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
    Paths: { cache: { uri: 'file:///cache/' } },
  };
});

/** @native-html/render가 끌어오는 ESM 전용 패키지(jest 변환 대상 밖). 디버그 직렬화에만 쓰여 그대로 돌려준다 */
jest.mock('stringify-entities', () => ({ stringifyEntities: (value: string) => value }));

/** AsyncStorage(상품 등록 임시저장): 패키지가 주는 메모리 구현. 네이티브 모듈이 없으면 import 시점에 던진다 */
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual<object>('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
