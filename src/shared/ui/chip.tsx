import { Pressable, Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

/** select: 시트·폼 선택 칩(37 r8) · filter: 목록 필터(32 r10) · meta: 옵션 그룹 메타(37 r10 15px) */
export type ChipVariant = 'select' | 'filter' | 'meta';

interface Props {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  variant?: ChipVariant;
  /** @deprecated variant="filter" */
  small?: boolean;
  className?: string;
}

const BOX: Record<ChipVariant, { base: string; on: string; off: string }> = {
  select: {
    base: 'h-[37px] rounded-sm px-3',
    on: 'border-primary bg-tint2',
    off: 'border-chip-border bg-surface',
  },
  meta: {
    base: 'h-[37px] rounded-md px-[13px]',
    on: 'border-primary bg-tint2',
    off: 'border-chip-border bg-surface',
  },
  filter: {
    base: 'h-8 rounded-md px-3',
    on: 'border-primary bg-primary',
    off: 'border-chip-off bg-surface',
  },
};
const LABEL: Record<ChipVariant, { base: string; on: string; off: string }> = {
  select: { base: 'text-base', on: 'text-primary', off: 'text-text2' },
  meta: { base: 'text-md', on: 'text-primary', off: 'text-text2' },
  filter: { base: 'text-base', on: 'font-medium text-surface', off: 'text-muted' },
};

/** 선택 칩. 선택 상태는 색과 accessibilityState 둘 다로 드러낸다 */
export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
  variant,
  small,
  className,
}: Props) {
  const v = variant ?? (small ? 'filter' : 'select');
  const state = selected ? 'on' : 'off';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={v === 'filter' ? 6 : 4}
      className={cn(
        'items-center justify-center border',
        BOX[v].base,
        BOX[v][state],
        disabled && 'opacity-40',
        className,
      )}
    >
      <Text className={cn('font-sans tracking-tight', LABEL[v].base, LABEL[v][state])}>
        {label}
      </Text>
    </Pressable>
  );
}

interface TagProps {
  label: string;
  /** dark: 폼 키워드 칩(pill 예외) · light: 시트 태그 칩(r8, × 삭제) */
  tone?: 'dark' | 'light';
  onRemove?: () => void;
}

export function TagChip({ label, tone = 'light', onRemove }: TagProps) {
  if (tone === 'dark') {
    return (
      <View className="h-[30px] flex-row items-center self-start rounded-full bg-tag-dark pl-3 pr-2.5">
        <Text className="font-sans text-sm font-bold tracking-tight text-surface">{label}</Text>
      </View>
    );
  }
  return (
    <View className="h-8 flex-row items-center gap-2 self-start rounded-sm bg-tag-light pl-2 pr-2.5">
      <Text className="font-sans text-md font-semibold tracking-tight text-label">{label}</Text>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 삭제`}
          onPress={onRemove}
          hitSlop={12}
        >
          <Text className="font-sans text-lg text-muted">×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
