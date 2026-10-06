import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, type ButtonProps } from './button';

type BarButton = Omit<ButtonProps, 'size' | 'pill' | 'className'>;

interface Props {
  primary: BarButton;
  /** 없으면 단일 버튼(.actbar.one) */
  secondary?: BarButton;
}

/** 화면 하단 고정 버튼 바(.actbar). 보조 : 주 = 130 : 210, 아래는 안전 영역만큼 */
export function ActionBar({ primary, secondary }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row gap-[7px] bg-surface px-3.5 pt-4"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      {secondary ? (
        <View style={{ flex: 130 }}>
          <Button variant="secondary" {...secondary} />
        </View>
      ) : null}
      <View style={{ flex: 210 }}>
        <Button {...primary} />
      </View>
    </View>
  );
}
