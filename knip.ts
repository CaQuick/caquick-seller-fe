import { type KnipConfig } from 'knip';

// 죽은 코드·미사용 의존성 검사. app/**·app.config.ts는 expo 플러그인이 entry로 잡는다.
const config: KnipConfig = {
  // tokens.ts는 tailwind.config.js(JS)가 require해 knip이 따라가지 못한다
  entry: ['scripts/*.{mjs,ts}', 'src/test/**/*.{ts,tsx}', 'src/shared/config/tokens.ts'],
  project: ['src/**/*.{ts,tsx}', 'app/**/*.tsx', 'scripts/**'],
  ignoreExportsUsedInFile: true,
  // global.css는 metro(withNativeWind)가 처리한다 — knip이 따라갈 import가 없다
  ignoreDependencies: [
    // expo-router의 SplashScreen이 쓰는 네이티브 모듈 — 직접 import하지 않는다
    'expo-splash-screen',
    // 폰트 파일 복사 원본(assets/fonts)
    'pretendard',
  ],
};

export default config;
