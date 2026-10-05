import { type ReactNode, useState } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

import { Icon } from './icon';

interface FieldFrameProps {
  label?: string;
  /** 라벨 아래 13px 보조 문구 */
  sublabel?: string;
  /** 필드 아래 빨간 문구. zod·REST fieldErrors 값을 그대로 넣는다 */
  error?: string | null;
  className?: string;
  children: ReactNode;
}

/** 라벨(16/600)·보조 라벨·오류 문구 틀. TextField·SelectField가 같이 쓴다 */
function FieldFrame({ label, sublabel, error, className, children }: FieldFrameProps) {
  return (
    <View className={className}>
      {label ? (
        <Text className="mb-3 font-sans text-lg font-semibold tracking-tight text-text2">
          {label}
        </Text>
      ) : null}
      {sublabel ? (
        <Text className="mb-2 font-sans text-sm tracking-tight text-sublabel">{sublabel}</Text>
      ) : null}
      {children}
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-1.5 font-sans text-xs text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const FRAME = {
  idle: 'border-border bg-surface',
  focus: 'border-primary bg-surface',
  error: 'border-danger bg-surface',
  readOnly: 'border-line bg-gray2',
};
const frame = (state: keyof typeof FRAME) => cn('flex-row rounded-sm border px-3', FRAME[state]);

interface Props extends Omit<TextInputProps, 'style' | 'className'> {
  label?: string;
  sublabel?: string;
  error?: string | null;
  /** 단위 접미(원·개·분) */
  suffix?: string;
  /** 숫자 입력처럼 오른쪽 정렬(.field.r) */
  alignRight?: boolean;
  className?: string;
}

export function TextField({
  label,
  sublabel,
  error,
  suffix,
  alignRight = false,
  multiline,
  editable = true,
  className,
  accessibilityLabel,
  onFocus,
  onBlur,
  ...input
}: Props) {
  const [focused, setFocused] = useState(false);
  const state = !editable ? 'readOnly' : error ? 'error' : focused ? 'focus' : 'idle';
  return (
    <FieldFrame label={label} sublabel={sublabel} error={error} className={className}>
      <View
        style={editable ? shadow.native.field : undefined}
        className={cn(
          frame(state),
          multiline ? 'min-h-[98px] items-start py-3' : 'h-12 items-center',
        )}
      >
        <TextInput
          {...input}
          editable={editable}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          textAlign={alignRight ? 'right' : 'left'}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled: !editable }}
          placeholderTextColor={multiline ? colors.placeholder2 : colors.placeholder}
          cursorColor={colors.caret}
          selectionColor={colors.caret}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            'flex-1 font-sans tracking-tight',
            multiline ? 'text-md' : 'text-lg',
            editable ? 'text-ink' : 'text-label',
          )}
        />
        {suffix ? (
          <Text className="pl-2 font-sans text-base tracking-tight text-label">{suffix}</Text>
        ) : null}
      </View>
    </FieldFrame>
  );
}

interface SelectProps {
  label?: string;
  sublabel?: string;
  error?: string | null;
  value?: string | null;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
}

/** 시트·피커를 여는 선택 필드(.field.sel). 값이 없으면 placeholder를 회색으로 */
export function SelectField({
  label,
  sublabel,
  error,
  value,
  placeholder = '선택하세요',
  onPress,
  disabled = false,
  className,
}: SelectProps) {
  return (
    <FieldFrame label={label} sublabel={sublabel} error={error} className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityValue={{ text: value ?? placeholder }}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={shadow.native.field}
        className={cn(
          frame(error ? 'error' : 'idle'),
          'h-12 items-center justify-between',
          disabled && 'opacity-40',
        )}
      >
        <Text
          numberOfLines={1}
          className={cn(
            'flex-1 font-sans text-lg tracking-tight',
            value ? 'text-text2' : 'text-muted',
          )}
        >
          {value ?? placeholder}
        </Text>
        <Icon name="chevronDown" size={16} color={colors.chevron} />
      </Pressable>
    </FieldFrame>
  );
}
