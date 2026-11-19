import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus, PixelRatio, Platform, View } from 'react-native';
import { GestureDetector, State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { type CakeRender } from '../../model/render-input';
import { Spin } from '../../model/three/spin';
import CakeViewer, { spinGesture, useCanvasGeneration } from './cake-viewer';

interface CanvasStyle {
  left: number;
  top: number;
  width: number;
  height: number;
  transform: { scale: number }[];
}

function canvasStyle(viewer: ReturnType<typeof screen.getByTestId>) {
  const canvas = viewer.children[0];
  if (!canvas || typeof canvas === 'string') throw new Error('캔버스가 없다');
  return canvas.props.style as CanvasStyle;
}

const RENDER: CakeRender = {
  shape: 'circle',
  design: null,
  color: '#FFFFFF',
  scale: 1,
  decals: [],
};

afterEach(() => jest.restoreAllMocks());

describe('spinGesture', () => {
  it('끌면 화면 폭 비율만큼 돌리고, 바로 떼면 관성이 남는다', async () => {
    const spin = new Spin();
    let time = 0;
    const gesture = spinGesture(spin, 400, () => (time += 16));
    await render(
      <GestureDetector gesture={gesture}>
        <View />
      </GestureDetector>,
    );
    // RNTL 14의 act는 비동기다 — 동기 작업도 Promise로 감싸 기다린다
    await act(() => {
      fireGestureHandler(getByGestureTestId('cake-spin'), [
        { state: State.BEGAN, absoluteX: 100 },
        { state: State.ACTIVE, absoluteX: 150 },
        { absoluteX: 200 },
        { state: State.END, absoluteX: 200 },
      ]);
      return Promise.resolve();
    });
    // 100px 끌기 = 화면 폭의 1/4 = 반 바퀴의 절반
    expect(spin.angle).toBeCloseTo(Math.PI / 2, 9);
    expect(spin.step(1 / 60)).toBe(true);
  });
});

describe('CakeViewer', () => {
  it('자리를 잡은 뒤 캔버스를 띄우고, 기기 배율이 2보다 크면 작게 그려 키운다', async () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(3);
    await render(<CakeViewer render={RENDER} request={{ yaw: 0 }} onError={jest.fn()} />);
    const viewer = screen.getByTestId('cake-viewer');
    expect(viewer.children).toHaveLength(0);
    await fireEvent(viewer, 'layout', { nativeEvent: { layout: { width: 300, height: 300 } } });
    const style = canvasStyle(viewer);
    expect([style.left, style.top, style.width, style.height].map(Math.round)).toEqual([
      50, 50, 200, 200,
    ]);
    expect(style.transform).toEqual([{ scale: 1.5 }]);
    expect(getByGestureTestId('cake-spin')).toBeTruthy();
  });

  it('기기 배율이 2 이하면 그대로 그린다', async () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(2);
    await render(<CakeViewer render={RENDER} request={{ yaw: 0 }} onError={jest.fn()} />);
    const viewer = screen.getByTestId('cake-viewer');
    await fireEvent(viewer, 'layout', { nativeEvent: { layout: { width: 300, height: 300 } } });
    expect(canvasStyle(viewer)).toMatchObject({ left: 0, width: 300, transform: [{ scale: 1 }] });
  });
});

describe('useCanvasGeneration', () => {
  /** 앱 상태 구독을 가로채 모든 구독자에게 상태를 보낸다 */
  function listen(os: 'ios' | 'android') {
    jest.replaceProperty(Platform, 'OS', os);
    const listeners: ((state: AppStateStatus) => void)[] = [];
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, cb) => {
      listeners.push(cb);
      return { remove };
    });
    const emit = (state: AppStateStatus) =>
      act(() => {
        listeners.forEach((listener) => listener(state));
        return Promise.resolve();
      });
    return { emit, remove };
  }

  it('Android는 백그라운드에서 돌아올 때만 캔버스를 새로 만든다', async () => {
    const app = listen('android');
    const hook = await renderHook(() => useCanvasGeneration());
    expect(hook.result.current).toBe(0);
    await app.emit('inactive');
    await app.emit('active');
    expect(hook.result.current).toBe(0);
    await app.emit('background');
    await app.emit('active');
    expect(hook.result.current).toBe(1);
    await hook.unmount();
    expect(app.remove).toHaveBeenCalled();
  });

  it('iOS는 돌아와도 캔버스를 그대로 둔다', async () => {
    const app = listen('ios');
    const hook = await renderHook(() => useCanvasGeneration());
    await app.emit('background');
    await app.emit('active');
    expect(hook.result.current).toBe(0);
  });
});
