const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// inlineRem 16: tailwind 간격(p-5 = 1.25rem)이 토큰의 px(20)와 맞게
const config = withNativeWind(getDefaultConfig(__dirname), {
  input: './global.css',
  inlineRem: 16,
});

// three의 require 입구(three.cjs)는 Node 전용 process.emitWarning을 불러 RN에서 죽는다.
// R3F 번들의 require('three')도 import 입구(three.module.js)로 풀어 모듈 하나를 나눠 쓴다
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = resolveRequest ?? context.resolveRequest;
  return moduleName === 'three'
    ? resolve({ ...context, isESMImport: true }, moduleName, platform)
    : resolve(context, moduleName, platform);
};

module.exports = config;
