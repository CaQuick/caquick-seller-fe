import { act, render } from '@testing-library/react-native';
import { DeviceEventEmitter, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster, toast } from 'sonner-native';

import { colors, fontWeight, radius, size, spacing } from '@/shared/config/tokens';

import { AppToaster, showToast, toastBottomOffset } from './toast';

jest.mock('sonner-native', () => ({
  Toaster: jest.fn(() => null),
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

const metrics = (bottom: number) => ({
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, bottom, left: 0, right: 0 },
});

const renderToaster = (bottom = 34) =>
  render(
    <SafeAreaProvider initialMetrics={metrics(bottom)}>
      <AppToaster />
    </SafeAreaProvider>,
  );

const lastProps = () => jest.mocked(Toaster).mock.lastCall![0];

/** 하단 CTA 바(ActionBar) 높이: 위 16 + 버튼 48 + 아래 max(안전 영역, 16) */
const actionBarHeight = (bottom: number) => 16 + size.button + Math.max(bottom, 16);

describe('toast', () => {
  beforeEach(() => jest.mocked(Toaster).mockClear());

  it('success·error·info·dismiss가 sonner-native로 간다', () => {
    showToast.success('저장했어요');
    showToast.error('실패했어요');
    showToast.info('안내');
    showToast.dismiss();
    expect(toast.success).toHaveBeenCalledWith('저장했어요');
    expect(toast.error).toHaveBeenCalledWith('실패했어요');
    expect(toast).toHaveBeenCalledWith('안내');
    expect(toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it('info에 onPress를 주면 누를 수 있는 토스트로 띄운다', () => {
    const onPress = jest.fn();
    showToast.info('새 주문', onPress);
    expect(toast).toHaveBeenLastCalledWith('새 주문', { onPress });
  });

  it.each([
    [34, 0, 120],
    [0, 0, 86],
    [48, 0, 134],
    [34, 336, 422],
    [0, 260, 346],
  ])('바닥 거리: 안전 영역 %i·키보드 %i이면 %i', (bottom, keyboard, expected) => {
    expect(toastBottomOffset(bottom, keyboard)).toBe(expected);
  });

  it.each([0, 16, 24, 34, 48])('안전 영역 %i에서 탭바와 하단 CTA 바보다 위에 뜬다', (bottom) => {
    const offset = toastBottomOffset(bottom, 0);
    expect(offset).toBe(size.tabBar + bottom + spacing.lg);
    expect(offset).toBeGreaterThan(actionBarHeight(bottom));
  });

  it('AppToaster는 하단 가운데·다크 테마로 탭바 위에 Toaster를 그린다', async () => {
    await renderToaster(34);
    expect(lastProps()).toMatchObject({
      position: 'bottom-center',
      theme: 'dark',
      duration: 2500,
      visibleToasts: 2,
      offset: 120,
    });
  });

  it('토스트는 시안의 어두운 바탕·흰 글자·r12이고 성공·실패만 표시가 다르다', async () => {
    await renderToaster();
    const { toastOptions, icons } = lastProps();
    expect(toastOptions?.style).toMatchObject({
      backgroundColor: colors.toastBg,
      borderRadius: radius.lg,
      marginHorizontal: spacing.gutter,
    });
    expect(toastOptions?.titleStyle).toMatchObject({
      color: colors.toastText,
      fontWeight: fontWeight.medium,
      fontSize: 14,
    });
    expect(icons?.success).toMatchObject({ props: { name: 'check', color: colors.toastSuccess } });
    expect(icons?.error).toMatchObject({ props: { name: 'alert', color: colors.toastError } });
    expect(icons).toHaveProperty('info', null);
  });

  it('iOS 키보드가 열리면 키보드 위로 올리고 닫히면 되돌린다', async () => {
    await renderToaster(34);
    await act(() => {
      DeviceEventEmitter.emit('keyboardWillShow', { endCoordinates: { height: 336 } });
    });
    expect(lastProps().offset).toBe(422);
    await act(() => {
      DeviceEventEmitter.emit('keyboardWillHide', { endCoordinates: { height: 0 } });
    });
    expect(lastProps().offset).toBe(120);
  });

  describe('Android', () => {
    beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));
    afterEach(() => jest.restoreAllMocks());

    it('창이 키보드만큼 줄어 키보드 이벤트로 올리지 않는다', async () => {
      await renderToaster(24);
      await act(() => {
        DeviceEventEmitter.emit('keyboardWillShow', { endCoordinates: { height: 300 } });
        DeviceEventEmitter.emit('keyboardDidShow', { endCoordinates: { height: 300 } });
      });
      expect(lastProps().offset).toBe(110);
    });
  });
});
