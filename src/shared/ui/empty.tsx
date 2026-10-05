import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** 빈 목록·검색 결과 없음. */
export function Empty({ title, description, action, className }: Props) {
  return (
    <View
      accessibilityLabel={title}
      className={cn('items-center justify-center gap-2 px-6 py-12', className)}
    >
      <Text className="text-center font-sans text-md font-semibold text-text2">{title}</Text>
      {description ? (
        <Text className="text-center font-sans text-sm text-muted">{description}</Text>
      ) : null}
      {action ? <View className="mt-2">{action}</View> : null}
    </View>
  );
}
