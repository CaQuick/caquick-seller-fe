import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  type BottomSheetModalProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { type ReactNode, type Ref } from 'react';
import { Text } from 'react-native';

import { colors, radius, size, spacing } from '@/shared/config/tokens';

interface Props extends Pick<
  BottomSheetModalProps,
  'snapPoints' | 'enableDynamicSizing' | 'onDismiss'
> {
  ref?: Ref<BottomSheetModal>;
  title?: string;
  children: ReactNode;
}

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
);

/**
 * 시안 바텀시트(상단 28px 라운드·그랩바·딤). 열고 닫기는 ref.present()/dismiss().
 * 내용 높이에 맞추는 enableDynamicSizing이 기본, 긴 목록은 snapPoints를 준다.
 */
export function AppBottomSheet({ ref, title, children, ...props }: Props) {
  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.sheet,
        borderTopRightRadius: radius.sheet,
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.grab,
        width: size.grab.width,
        height: size.grab.height,
      }}
      {...props}
    >
      <BottomSheetView
        accessibilityViewIsModal
        style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing['2xl'] }}
      >
        {title ? (
          <Text accessibilityRole="header" className="mb-4 font-sans text-xl font-bold text-text">
            {title}
          </Text>
        ) : null}
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
