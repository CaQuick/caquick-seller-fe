import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toaster, toast } from 'sonner-native';

import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  radius,
  shadow,
  size,
  spacing,
  tracking,
} from '@/shared/config/tokens';

import { Icon } from './icon';

/** 토스트는 이 셋으로만 띄운다 — 문구는 한국어 한 줄, 옵션은 여기서 고정 */
export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  /** onPress가 있으면 토스트를 눌러 그 화면으로 간다 */
  info: (message: string, onPress?: () => void) =>
    onPress ? toast(message, { onPress }) : toast(message),
  dismiss: () => toast.dismiss(),
};

/**
 * 화면 바닥에서 토스트까지의 거리. 탭바(70 + 안전 영역)와 하단 CTA 바(.actbar)를 같은 값으로 넘는다.
 * 키보드가 열리면 안전 영역 대신 키보드 위에서 잰다(입력바가 키보드 위로 올라오는 화면이 있다)
 */
export const toastBottomOffset = (safeBottom: number, keyboardHeight: number) =>
  Math.max(safeBottom, keyboardHeight) + size.tabBar + spacing.lg;

/**
 * iOS 키보드 높이. 토스트는 앱 창 위 오버레이라 키보드에 가린다.
 * Android는 창이 키보드만큼 줄어 0으로 둔다(화면들의 KeyboardAvoidingView와 같은 전제)
 */
function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

// 시안 .toast: 어두운 바탕·흰 14px·r12·좌우 20. Toaster가 옵션 객체 동일성으로 메모해 모듈 상수로 둔다
const TOAST_OPTIONS = {
  style: {
    backgroundColor: colors.toastBg,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: spacing.gutter,
    ...shadow.native.toast,
  },
  toastContentStyle: { gap: spacing.sm },
  titleStyle: {
    fontFamily,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.base.size,
    lineHeight: fontSize.base.lineHeight,
    letterSpacing: tracking(fontSize.base.size),
    color: colors.toastText,
  },
};

/** 성공은 민트 ✓, 실패는 연한 빨강 !, 안내는 표시 없이 문구만 */
const TOAST_ICONS = {
  success: <Icon name="check" size={16} strokeWidth={3} color={colors.toastSuccess} />,
  error: <Icon name="alert" size={16} strokeWidth={2.4} color={colors.toastError} />,
  info: null,
};

/** 루트 Providers 안에서 한 번. 위쪽은 상태바·다이나믹 아일랜드와 겹쳐 아래에 띄운다 */
export function AppToaster() {
  const { bottom } = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  return (
    <Toaster
      position="bottom-center"
      theme="dark"
      duration={2500}
      visibleToasts={2}
      offset={toastBottomOffset(bottom, keyboardHeight)}
      icons={TOAST_ICONS}
      toastOptions={TOAST_OPTIONS}
    />
  );
}
