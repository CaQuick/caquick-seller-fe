import { Stack } from 'expo-router';
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';
import { AppHeader, ErrorState, Screen, SkeletonRows } from '@/shared/ui';

import { storeErrorMessage } from '../model/messages';

/** 안내 박스(.box): 연보라 r12, 13/19 */
export function InfoBox({
  children,
  tone = 'info',
  className,
}: {
  children: ReactNode;
  tone?: 'info' | 'danger';
  className?: string;
}) {
  return (
    <View
      accessible={tone === 'danger'}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'danger' ? 'polite' : undefined}
      className={cn('rounded-lg p-3', tone === 'danger' ? 'bg-danger-bg' : 'bg-tint2', className)}
    >
      <Text
        className={cn(
          'font-sans text-sm leading-[19px] tracking-tight',
          tone === 'danger' ? 'text-danger' : 'text-text3',
        )}
      >
        {children}
      </Text>
    </View>
  );
}

/** 필드 라벨(.lbl15 16/600) */
export function FieldLabel({ children, first = false }: { children: string; first?: boolean }) {
  return (
    <Text
      className={cn(
        'mb-3 font-sans text-lg font-semibold tracking-tight text-text2',
        first ? 'mt-[38px]' : 'mt-[18px]',
      )}
    >
      {children}
    </Text>
  );
}

/** 상세 화면 틀: 네이티브 헤더 대신 시안 헤더(.hdr). 하단 버튼 바(ActionBar)가 있으면 아래 안전 영역은 바가 맡는다 */
export function SubScreen({
  title,
  children,
  actionBar = false,
}: {
  title: string;
  children: ReactNode;
  actionBar?: boolean;
}) {
  return (
    <Screen edges={actionBar ? ['top'] : ['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title={title} />
      {children}
    </Screen>
  );
}

/** 첫 조회의 로딩·오류. 데이터가 있으면 null */
export function QueryGate({
  isPending,
  error,
  onRetry,
}: {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (isPending) {
    return (
      <View className="px-5">
        <SkeletonRows count={4} />
      </View>
    );
  }
  if (error) return <ErrorState description={storeErrorMessage(error)} onRetry={onRetry} />;
  return null;
}

/** 섹션 제목(.sec-h) + 오른쪽 회색 보조 문구 */
export function SectionTitle({
  title,
  sub,
  aside,
}: {
  title: string;
  sub?: string;
  aside?: string;
}) {
  return (
    <View className="flex-row items-end justify-between gap-3 pb-2.5 pt-6">
      <Text
        accessibilityRole="header"
        className="font-sans text-lg font-bold tracking-tight text-text2"
      >
        {title}
        {sub ? <Text className="font-sans text-sm font-normal text-muted">{` ${sub}`}</Text> : null}
      </Text>
      {aside ? <Text className="font-sans text-sm tracking-tight text-muted">{aside}</Text> : null}
    </View>
  );
}
