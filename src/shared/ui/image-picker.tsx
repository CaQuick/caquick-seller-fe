import { Image, Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

import { Icon } from './icon';

interface DropzoneProps {
  count: number;
  max?: number;
  onPress: () => void;
  className?: string;
}

/** 이미지 추가 영역(.drop 159px 점선 r16). 가득 차면 누르지 못한다 */
export function ImageDropzone({ count, max = 6, onPress, className }: DropzoneProps) {
  const full = count >= max;
  const label = `이미지 추가 (${count}/${max})`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: full }}
      disabled={full}
      onPress={onPress}
      className={cn(
        'h-[159px] items-center justify-center gap-[13px] rounded-xl border border-dashed border-dash',
        full && 'opacity-40',
        className,
      )}
    >
      <View className="h-[59px] w-[59px] items-center justify-center rounded-full bg-gray2">
        <Icon name="add" size={26} color={colors.sublabel} />
      </View>
      <Text className="font-sans text-md font-medium tracking-tight text-muted">{label}</Text>
    </Pressable>
  );
}

interface ThumbProps {
  uri: string;
  onRemove?: () => void;
  /** 접근성 이름 앞부분('상품 이미지 1') */
  label: string;
  size?: number;
}

/** 썸네일(.thumb r14) + 오른쪽 위 × 삭제 */
export function ImageThumb({ uri, onRemove, label, size = 82 }: ThumbProps) {
  return (
    <View className="overflow-hidden rounded-thumb bg-gray2" style={{ width: size, height: size }}>
      <Image accessibilityLabel={label} source={{ uri }} style={{ width: size, height: size }} />
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 삭제`}
          onPress={onRemove}
          hitSlop={10}
          className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center"
        >
          <Text className="font-sans text-3xl leading-[22px] text-surface">×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
