import { type KnipConfig } from 'knip';

// 죽은 코드·미사용 의존성 검사. app/**·app.config.ts는 expo 플러그인이 entry로 잡는다.
const config: KnipConfig = {
  // tokens.ts는 tailwind.config.js(JS)가 require해 knip이 따라가지 못한다
  entry: ['scripts/*.{mjs,ts}', 'src/test/**/*.{ts,tsx}', 'src/shared/config/tokens.ts'],
  project: ['src/**/*.{ts,tsx}', 'app/**/*.tsx', 'scripts/**'],
  ignoreExportsUsedInFile: true,
  // global.css는 metro(withNativeWind)가 처리한다 — knip이 따라갈 import가 없다
  ignoreDependencies: [
    // app.config.ts plugins로만 쓰인다
    'expo-splash-screen',
    // 폰트 파일 복사 원본(assets/fonts)
    'pretendard',
    // 스캐폴드 단계에 미리 핀한 런타임 의존성 — 해당 기능 PR이 import하면 여기서 뺀다
    '@native-html/render',
    '@react-native-async-storage/async-storage',
    '@react-native-community/datetimepicker',
    'expo-image',
    'react-native-calendars',
    'react-native-sortables',
  ],
};

export default config;
