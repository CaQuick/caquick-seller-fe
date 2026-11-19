// Skia로 실제 픽셀을 그리는 spec의 환경: RN jest 환경에 CanvasKit(wasm)을 올린다.
// 초기화가 무거워 전역으로 두지 않고 파일 첫 주석(@jest-environment ./src/test/skia-environment.js)으로 고른다
const RNEnvironment = require('@react-native/jest-preset/jest/react-native-env.js');
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit');

class SkiaEnvironment extends RNEnvironment {
  async setup() {
    await super.setup();
    this.global.CanvasKit = await CanvasKitInit({});
  }
}

module.exports = SkiaEnvironment;
