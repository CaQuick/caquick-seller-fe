const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// inlineRem 16: tailwind 간격(p-5 = 1.25rem)이 토큰의 px(20)와 맞게
module.exports = withNativeWind(getDefaultConfig(__dirname), {
  input: './global.css',
  inlineRem: 16,
});
