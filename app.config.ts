import { type ConfigContext, type ExpoConfig } from 'expo/config';

// Pretendard 정적 4종(OFL, assets/fonts/OFL.txt). iOS는 PostScript 이름으로 family "Pretendard"가 잡히고,
// Android는 XML family로 weight를 묶어 양쪽 모두 fontFamily: 'Pretendard' + fontWeight로 쓴다.
const PRETENDARD = [
  { path: './assets/fonts/Pretendard-Regular.otf', weight: 400 },
  { path: './assets/fonts/Pretendard-Medium.otf', weight: 500 },
  { path: './assets/fonts/Pretendard-SemiBold.otf', weight: 600 },
  { path: './assets/fonts/Pretendard-Bold.otf', weight: 700 },
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '케이퀵 판매자',
  slug: 'caquick-seller',
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
    adaptiveIcon: {
      backgroundColor: '#FBFBFF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  // TODO(EAS): Expo 조직 caquick 생성 뒤 `eas init`이 넣는 projectId로 채운다 — https://u.expo.dev/<projectId>
  // updates: { url: 'https://u.expo.dev/<projectId>' },
  runtimeVersion: { policy: 'fingerprint' },
  experiments: { typedRoutes: true },
  plugins: [
    'expo-router',
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
  ],
  extra: {
    // TODO(EAS): eas: { projectId: '<projectId>' }
  },
});
