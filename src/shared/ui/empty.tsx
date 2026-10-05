import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';

import { Button } from './button';
import { Icon, type IconName } from './icon';

interface Props {
  title: string;
  description?: string;
  /** 56px 연보라 아이콘 박스 */
  icon?: IconName;
  action?: ReactNode;
  className?: string;
}

function StatePanel({
  title,
  description,
  icon,
  action,
  className,
  tone,
}: Props & { tone: 'empty' | 'error' }) {
  return (
    <View
      accessibilityLabel={title}
      className={cn('items-center justify-center gap-1.5 px-6 py-14', className)}
    >
      {icon ? (
        <View
          className={cn(
            'mb-2 h-14 w-14 items-center justify-center rounded-xl',
            tone === 'error' ? 'bg-danger-bg' : 'bg-tint',
          )}
        >
          <Icon
            name={icon}
            size={26}
            color={tone === 'error' ? colors.danger : colors.primaryStrong}
          />
        </View>
      ) : null}
      <Text className="text-center font-sans text-lg font-semibold tracking-tight text-text2">
        {title}
      </Text>
      {description ? (
        <Text className="text-center font-sans text-sm tracking-tight text-muted">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-3">{action}</View> : null}
    </View>
  );
}

/** 빈 목록·검색 결과 없음 */
export function Empty(props: Props) {
  return <StatePanel {...props} tone="empty" />;
}

interface ErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** 불러오기 실패. 네트워크 오류는 다시 시도 버튼과 함께 */
export function ErrorState({
  title = '불러오지 못했어요',
  description = '네트워크 상태를 확인한 뒤 다시 시도해 주세요',
  onRetry,
  retryLabel = '다시 시도',
  className,
}: ErrorProps) {
  return (
    <StatePanel
      tone="error"
      icon="alert"
      title={title}
      description={description}
      className={className}
      action={
        onRetry ? (
          <Button title={retryLabel} variant="secondary" size="sm" onPress={onRetry} />
        ) : null
      }
    />
  );
}
