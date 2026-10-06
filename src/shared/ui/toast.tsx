import { Toaster, toast } from 'sonner-native';

import { colors, fontFamily, radius } from '@/shared/config/tokens';

/** 토스트는 이 셋으로만 띄운다 — 문구는 한국어 한 줄, 옵션은 여기서 고정 */
export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  /** onPress가 있으면 토스트를 눌러 그 화면으로 간다 */
  info: (message: string, onPress?: () => void) =>
    onPress ? toast(message, { onPress }) : toast(message),
  dismiss: () => toast.dismiss(),
};

/** 루트 Providers 안에서 한 번. 라이트 전용이라 theme도 고정 */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      theme="light"
      duration={2500}
      visibleToasts={2}
      offset={8}
      toastOptions={{
        style: { backgroundColor: colors.surface, borderRadius: radius.lg },
        titleStyle: { fontFamily, fontSize: 14, color: colors.text },
        descriptionStyle: { fontFamily, fontSize: 13, color: colors.label },
      }}
    />
  );
}
