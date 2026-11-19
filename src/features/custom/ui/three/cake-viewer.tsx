import { Canvas } from '@react-three/fiber/native';
import { useEffect, useMemo, useState } from 'react';
import { AppState, PixelRatio, Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { usePretendardFonts } from '@/shared/lib/skia-text';

import { type CakeRender } from '../../model/render-input';
import { Spin } from '../../model/three/spin';
import { CakeScene, type YawRequest } from './cake-scene';
import { useDecalTextures } from './use-decal-textures';

/** 해상도 상한. expo-gl은 기기 배율로만 그려서, 배율이 더 높으면 작게 그린 뒤 키워 보인다 */
const MAX_DPR = 2;

export interface CakeViewerProps {
  render: CakeRender;
  request: YawRequest;
  /** GL·텍스처 오류. 화면은 구매자 캡처로 바꾼다 */
  onError: (error: unknown) => void;
  /** 끌기 시각(ms). 테스트가 바꾼다 */
  now?: () => number;
}

/** Android는 앱이 뒤로 갔다 오면 GL 컨텍스트를 잃을 수 있어 캔버스를 새로 만든다 */
export function useCanvasGeneration() {
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous === 'background' && next === 'active') setGeneration((g) => g + 1);
      previous = next;
    });
    return () => subscription.remove();
  }, []);
  return generation;
}

/** 화면 폭만큼 끌면 한 바퀴. 손가락이 닿을 때부터 떼거나 취소될 때까지 Spin에 넘긴다 */
export const spinGesture = (spin: Spin, width: number, now: () => number) =>
  Gesture.Pan()
    .runOnJS(true)
    .withTestId('cake-spin')
    .onBegin((e) => spin.start(e.absoluteX, now()))
    .onUpdate((e) => spin.drag(e.absoluteX, now(), width))
    .onFinalize(() => spin.end(now()));

/** 옆모습 3D 케이크. 좌우로 끌면 돌고 놓으면 관성으로 멈춘다(그릴 일이 있을 때만 그린다) */
export default function CakeViewer({ render, request, onError, now = Date.now }: CakeViewerProps) {
  const fonts = usePretendardFonts();
  const { pixels, textures } = useDecalTextures(render.decals, fonts, onError);
  const [spin] = useState(() => new Spin());
  const [size, setSize] = useState({ width: 0, height: 0 });
  const generation = useCanvasGeneration();
  const pan = useMemo(() => spinGesture(spin, size.width, now), [spin, now, size.width]);
  const ratio = Math.min(1, MAX_DPR / PixelRatio.get());
  return (
    <GestureDetector gesture={pan}>
      <View
        testID="cake-viewer"
        accessibilityLabel="3D 케이크. 좌우로 끌어 돌려 보세요"
        className="flex-1"
        onLayout={(e) => setSize(e.nativeEvent.layout)}
      >
        {size.width > 0 ? (
          <Canvas
            key={generation}
            flat
            orthographic
            frameloop="demand"
            camera={{ near: 0.1, far: 50 }}
            style={{
              position: 'absolute',
              left: (size.width * (1 - ratio)) / 2,
              top: (size.height * (1 - ratio)) / 2,
              width: size.width * ratio,
              height: size.height * ratio,
              transform: [{ scale: 1 / ratio }],
            }}
          >
            <CakeScene
              render={render}
              pixels={pixels}
              textures={textures}
              spin={spin}
              request={request}
            />
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}
