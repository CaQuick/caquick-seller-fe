import { Children, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

import { Icon, type IconName } from './icon';

/** 메뉴 행 묶음(.mrows): 흰 카드 r16, 행 사이 1px 구분선 */
export function MenuGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View
      style={shadow.native.card}
      className={cn('overflow-hidden rounded-xl bg-surface', className)}
    >
      {Children.toArray(children).map((child, i) => (
        <View key={i} className={cn(i > 0 && 'border-t border-line2')}>
          {child}
        </View>
      ))}
    </View>
  );
}

interface RowProps {
  title: string;
  description?: string;
  icon?: IconName;
  /** 오른쪽 회색 보조 문구('수정', '1.0.0') */
  aux?: string;
  /** 오른쪽 조작 요소(스위치·스테퍼·배지). 있으면 행 자체는 누르지 않는다 */
  accessory?: ReactNode;
  onPress?: () => void;
  /** 로그아웃·탈퇴 */
  danger?: boolean;
}

/** 메뉴 행(.mrow): 아이콘 36 r10 · 제목 15/500 · 설명 12 · 보조 · chevron(누를 수 있을 때) */
export function MenuRow({
  title,
  description,
  icon,
  aux,
  accessory,
  onPress,
  danger = false,
}: RowProps) {
  const pressable = onPress && !accessory;
  const body = (
    <>
      {icon ? (
        <View className="h-9 w-9 items-center justify-center rounded-md bg-tint">
          <Icon name={icon} size={20} color={colors.primaryStrong} />
        </View>
      ) : null}
      <View className="flex-1">
        <Text
          className={cn(
            'font-sans text-md font-medium tracking-tight',
            danger ? 'text-danger' : 'text-text',
          )}
        >
          {title}
        </Text>
        {description ? (
          <Text className="mt-0.5 font-sans text-xs tracking-tight text-muted">{description}</Text>
        ) : null}
      </View>
      {aux ? <Text className="font-sans text-base tracking-tight text-muted">{aux}</Text> : null}
      {accessory}
      {pressable ? (
        <Icon name="chevronRight" size={16} color={colors.chevron} strokeWidth={2.5} />
      ) : null}
    </>
  );
  const row = 'min-h-14 flex-row items-center gap-3 px-4 py-2.5';
  return pressable ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, description, aux].filter(Boolean).join(', ')}
      onPress={onPress}
      className={row}
    >
      {body}
    </Pressable>
  ) : (
    <View className={row}>{body}</View>
  );
}
