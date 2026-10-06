// jest-expo preset: 환경은 react-native-env(node 기반) → Node 24 fetch가 MSW(msw/node)에 닿는다.
// app/ 안에는 spec을 두지 않는다(typed routes가 빈 router.d.ts를 만드는 버그) → roots는 src만.
const preset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  // preset의 babel 변환은 .[jt]sx?만 — ESM 전용 패키지(.mjs, msw가 끄는 rettime)도 같은 옵션으로 변환한다
  transform: { ...preset.transform, '\\.m[jt]s$': preset.transform['\\.[jt]sx?$'] },
  // worklets는 jest에서 .native 구현(JSI 필수) 대신 JS 구현을 쓰도록 자체 resolver를 준다
  resolver: 'react-native-worklets/jest/resolver.js',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/test/mocks/index.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/test/mocks/style.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    // RN jest 환경의 export 조건(react-native)에서 msw/node는 null로 막혀 있다 — Node 구현을 직접 가리킨다
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
  },
  // jest-expo 기본 목록 + ESM만 배포하는 패키지(msw 2.13+의 rettime 등). 접두 일치라 react-native-*·expo-*를 전부 덮는다
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|msw|rettime|until-async|@open-draft|@mswjs|nativewind|@gorhom|sonner-native))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.tsx',
    '!src/test/**',
    '!src/graphql/generated/**',
    '!src/shared/ui/**',
    '!**/*.spec.*',
  ],
  // 실측(2026-10-06: 97.57/92.93/95.84/97.94)의 정수 내림(D45). CI는 3샤드 병합 결과로 같은 값을 검사한다
  coverageThreshold: { global: { statements: 97, branches: 92, functions: 95, lines: 97 } },
  coverageReporters: ['text-summary', 'lcov', 'json'],
  // 로컬(운영 맥미니)은 4개. CI는 러너 기본값
  ...(process.env.CI ? {} : { maxWorkers: 4 }),
};
