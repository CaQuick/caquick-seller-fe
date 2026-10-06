import { type ConfigContext, type ExpoConfig } from 'expo/config';

// Pretendard 정적 4종(OFL, assets/fonts/OFL.txt). iOS는 PostScript 이름으로 family "Pretendard"가 잡히고,
// Android는 XML family로 weight를 묶어 양쪽 모두 fontFamily: 'Pretendard' + fontWeight로 쓴다.
const PRETENDARD = [
  { path: './assets/fonts/Pretendard-Regular.otf', weight: 400 },
  { path: './assets/fonts/Pretendard-Medium.otf', weight: 500 },
  { path: './assets/fonts/Pretendard-SemiBold.otf', weight: 600 },
  { path: './assets/fonts/Pretendard-Bold.otf', weight: 700 },
];

/** EAS 프로젝트 @caquick/caquick-seller. 동적 설정이라 `eas init`이 쓰지 못해 직접 둔다 */
const EAS_PROJECT_ID = '491006a8-4cc4-40df-bdd6-bde68ddb5195';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '케이퀵 판매자',
  slug: 'caquick-seller',
  owner: 'caquick',
  version: '1.0.0',
  scheme: 'caquickseller',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'com.caquick.seller',
    supportsTablet: false,
    infoPlist: { CFBundleAllowMixedLocalizations: true },
  },
  android: {
    package: 'com.caquick.seller',
    // FCM(Android 푸시 토큰). 파일은 커밋하지 않고 빌드 환경이 경로를 준다 — 없으면 푸시 등록만 실패한다
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    adaptiveIcon: {
      backgroundColor: '#FBFBFF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  runtimeVersion: { policy: 'fingerprint' },
  experiments: { typedRoutes: true },
  plugins: [
    'expo-router',
    // 64비트 ARM만 — x86류는 에뮬레이터용, 32비트 전용 OS 기기(Android Go 저가폰)는 지원하지 않는다
    ['expo-build-properties', { android: { buildArchs: ['arm64-v8a'] } }],
    [
      'expo-font',
      {
        ios: { fonts: PRETENDARD.map((f) => f.path) },
        android: { fonts: [{ fontFamily: 'Pretendard', fontDefinitions: PRETENDARD }] },
      },
    ],
    'expo-secure-store',
    ['expo-notifications', { defaultChannel: 'default' }],
    'expo-updates',
    [
      'expo-image-picker',
      { photosPermission: '상품·매장 사진을 올리기 위해 사진 보관함에 접근합니다.' },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: '매장 주소의 지역을 찾기 위해 현재 위치를 사용합니다.',
        // 포그라운드만 쓴다 — 플러그인 기본값인 영문 '항상 허용'·동작 인식 문구를 넣지 않는다
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        motionUsagePermission: false,
      },
    ],
  ],
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
  },
});
