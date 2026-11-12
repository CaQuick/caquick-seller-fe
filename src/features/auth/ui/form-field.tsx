import { useState } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

interface FieldProps extends Omit<TextInputProps, 'style' | 'className' | 'secureTextEntry'> {
  label: string;
  /** 아래 빨간 문구 + 빨간 테두리 */
  error?: string;
  /** 문구 없이 테두리만 빨갛게(로그인 자격증명 오류는 두 칸을 함께 표시) */
  invalid?: boolean;
  /** 오류가 없을 때 아래 회색 안내 */
  hint?: string;
  /** 비밀번호 입력 — 눈 버튼으로 가림을 토글한다 */
  secret?: boolean;
}

function EyeIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

/** 라벨 + 48px 입력 + 아래 오류/안내. 접근성 이름은 라벨과 같다 */
export function AuthField({ label, error, invalid, hint, secret, ...input }: FieldProps) {
  const [hidden, setHidden] = useState(true);
  return (
    <View>
      <Text className="mb-3 font-sans text-lg font-semibold tracking-tight text-text2">
        {label}
      </Text>
      <View
        style={shadow.native.field}
        className={cn(
          'h-12 flex-row items-center rounded-sm border bg-surface pl-3',
          error || invalid ? 'border-danger' : 'border-border',
          !secret && 'pr-3',
        )}
      >
        <TextInput
          {...input}
          accessibilityLabel={label}
          secureTextEntry={secret === true && hidden}
          placeholderTextColor={colors.placeholder}
          className="h-full flex-1 font-sans text-lg tracking-tight text-ink"
        />
        {secret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? `${label} 보기` : `${label} 가리기`}
            onPress={() => setHidden((v) => !v)}
            className="h-11 w-11 items-center justify-center"
          >
            <EyeIcon color={hidden ? colors.placeholder2 : colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-1.5 font-sans text-xs text-danger">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-1.5 font-sans text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  busy?: boolean;
  /** 진행 중 문구(접근성 이름은 label 그대로) */
  busyLabel?: string;
  /** 서버가 잠근 상태 — 회색으로 비활성 */
  locked?: boolean;
}

/** 폼 하단 주 버튼. 진행 중은 연보라 + 문구, 잠금은 회색 */
export function SubmitButton({
  label,
  onPress,
  busy = false,
  busyLabel,
  locked = false,
}: ButtonProps) {
  const disabled = busy || locked;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-12 items-center justify-center rounded-sm',
        locked ? 'bg-track' : busy ? 'bg-primary-soft' : 'bg-primary',
      )}
    >
      <Text
        className={cn(
          'font-sans text-lg tracking-tight',
          locked ? 'text-placeholder' : 'text-surface',
        )}
      >
        {busy && busyLabel ? busyLabel : label}
      </Text>
    </Pressable>
  );
}
