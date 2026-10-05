import { Pressable } from 'react-native';

import { colors, shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

import { Icon, type IconName } from './icon';

interface Props {
  onPress: () => void;
  accessibilityLabel: string;
  icon?: IconName;
  /** 위치. 기본은 오른쪽 아래(탭바 위) */
  className?: string;
}

/** 플로팅 버튼(68, r20 — 원이 아니다, D43) */
export function Fab({ onPress, accessibilityLabel, icon = 'add', className }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={shadow.native.fab}
      className={cn(
        'absolute bottom-6 right-6 h-[68px] w-[68px] items-center justify-center rounded-2xl bg-primary-strong',
        className,
      )}
    >
      <Icon name={icon} size={24} color={colors.surface} />
    </Pressable>
  );
}
