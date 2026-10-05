// jsxImportSource가 빠지면 className이 조용히 무시된다. worklets 플러그인은 preset의 자동 추가를 끄고 맨 마지막에 둔다.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind', worklets: false }],
      'nativewind/babel',
    ],
    plugins: ['react-native-worklets/plugin'],
  };
};
