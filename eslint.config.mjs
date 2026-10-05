import js from '@eslint/js';
// eslint-config-expo/flat 전체는 eslint-plugin-react(ESLint 10 미지원, context.getFilename)를 끌고 와 깨진다 —
// core(import·globals)·typescript·expo 규칙만 가져오고 react-hooks는 직접 단다. 57.x가 ESLint 10을 지원하면 flat.js로 되돌린다.
import expoCore from 'eslint-config-expo/flat/utils/core.js';
import expoRules from 'eslint-config-expo/flat/utils/expo.js';
import expoTypescript from 'eslint-config-expo/flat/utils/typescript.js';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// 의존 방향(guide §2): shared는 features를 모른다. feature 간 import는 대상 index.ts로만. app/은 feature의 index.ts·shared만 본다.
export default tseslint.config(
  {
    ignores: [
      '.expo',
      'coverage',
      'node_modules',
      'src/graphql/generated',
      'expo-env.d.ts',
      'ios',
      'android',
    ],
  },
  js.configs.recommended,
  ...expoCore,
  ...expoTypescript,
  ...expoRules,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node, __DEV__: 'readonly' },
    },
    rules: {
      // default export와 같은 이름의 named export가 있다는 경고 — typescript-eslint 관용구(tseslint.config)에 걸린다
      'import/no-named-as-default-member': 'off',
    },
    settings: {
      // 별칭(@/)을 tsconfig paths로 푼다 — 없으면 boundaries가 외부 모듈로 보고 검사하지 않는다
      'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' } },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, boundaries },
    settings: {
      'boundaries/include': ['src/**/*', 'app/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'app/**' },
        { type: 'feature', pattern: 'src/features/*', capture: ['name'] },
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'graphql', pattern: 'src/graphql/**' },
        { type: 'test', pattern: 'src/test/**' },
      ],
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      // React Compiler를 쓰지 않는다 — 컴파일러 호환성 경고는 의미가 없다
      'react-hooks/incompatible-library': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 토큰은 메모리(zustand)·SecureStore에만. AsyncStorage는 임시저장 초안 전용이라 products feature 밖에서 막는다
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@react-native-async-storage/async-storage',
              message:
                'AsyncStorage는 features/products의 임시저장 초안에만 쓴다. 토큰·세션은 expo-secure-store.',
            },
            {
              name: 'react-native',
              importNames: ['SafeAreaView'],
              message: 'RN SafeAreaView는 deprecated — react-native-safe-area-context의 훅을 쓴다.',
            },
          ],
        },
      ],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { types: { anyOf: ['app', 'shared', 'graphql'] } } } },
            },
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { type: 'feature', fileInternalPath: 'index.ts' } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { types: { anyOf: ['shared', 'graphql'] } } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: {
                to: {
                  element: {
                    type: 'feature',
                    captured: { name: '{{ from.element.captured.name }}' },
                  },
                },
              },
            },
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { type: 'feature', fileInternalPath: 'index.ts' } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { types: { anyOf: ['shared', 'graphql'] } } } },
            },
            {
              from: { element: { type: 'graphql' } },
              allow: { to: { element: { type: 'graphql' } } },
            },
            {
              from: { element: { type: 'test' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['test', 'shared', 'feature', 'graphql', 'app'] } },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    // 임시저장 초안(D30)만 AsyncStorage 허용
    files: ['src/features/products/model/draft-store.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // 스펙은 어느 계층이든 test 헬퍼·feature·shared를 가져온다 — 경계 규칙은 소스에만
    files: ['src/**/*.spec.{ts,tsx}', 'src/test/**'],
    rules: {
      'boundaries/dependencies': 'off',
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // 설정 파일(metro·babel·tailwind·jest)은 CJS
    files: ['**/*.{js,mjs,cjs}', 'scripts/**'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
);
