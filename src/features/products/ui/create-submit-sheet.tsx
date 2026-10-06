import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { type RefObject } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { AppBottomSheet, Button, Icon } from '@/shared/ui';

import { CREATE_STEPS, type CreateStepId } from '../model/draft-submit';

export type SubmitPhase = 'running' | 'failed' | 'abandoning';

interface Props {
  ref: RefObject<BottomSheetModal | null>;
  phase: SubmitPhase;
  current: CreateStepId | null;
  error: string | null;
  /** 이미 만든 상품이 있으면 포기는 삭제다 */
  hasProduct: boolean;
  onRetry: () => void;
  onAbandon: () => void;
}

/** 등록 체인 진행(단계별 ✓·진행 중·실패)과 실패 뒤 재시도/포기 */
export function SubmitSheet({ ref, phase, current, error, hasProduct, onRetry, onAbandon }: Props) {
  const at = CREATE_STEPS.findIndex((s) => s.id === current);
  const failed = phase === 'failed';
  return (
    <AppBottomSheet ref={ref}>
      <View testID="submit-sheet">
        <Text
          accessibilityRole="header"
          className="my-2 text-center font-sans text-2xl font-bold tracking-tighter text-ink"
        >
          {failed ? '등록을 마치지 못했어요' : '상품을 등록하고 있어요'}
        </Text>
        <View className="my-4 gap-3">
          {CREATE_STEPS.map((s, i) => {
            const state = i < at ? 'done' : i === at ? (failed ? 'failed' : 'now') : 'todo';
            return (
              <View
                key={s.id}
                accessible
                accessibilityLabel={`${s.label} ${STATE_LABEL[state]}`}
                className="h-6 flex-row items-center gap-2.5"
              >
                <View className="w-5 items-center">
                  {state === 'done' ? (
                    <Icon name="check" size={18} color={colors.primary} />
                  ) : state === 'now' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : state === 'failed' ? (
                    <Icon name="alert" size={18} color={colors.danger} />
                  ) : (
                    <View className="h-1.5 w-1.5 rounded-full bg-placeholder2" />
                  )}
                </View>
                <Text
                  className={cn(
                    'font-sans text-md tracking-tight',
                    state === 'todo'
                      ? 'text-muted'
                      : state === 'failed'
                        ? 'text-danger'
                        : 'text-text2',
                  )}
                >
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>
        {failed ? (
          <>
            {error ? (
              <Text
                accessibilityLiveRegion="polite"
                className="mb-2 text-center font-sans text-base tracking-tight text-danger"
              >
                {error}
              </Text>
            ) : null}
            <Text className="mb-5 text-center font-sans text-sm tracking-tight text-muted">
              {hasProduct
                ? '만든 상품은 숨김 상태로 남아 있어요. 이어서 등록하거나 포기할 수 있어요'
                : '아직 만들어진 상품은 없어요'}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  title={hasProduct ? '포기하기' : '닫기'}
                  variant={hasProduct ? 'dangerOutline' : 'secondary'}
                  onPress={onAbandon}
                />
              </View>
              <View className="flex-1">
                <Button title="다시 시도" onPress={onRetry} />
              </View>
            </View>
          </>
        ) : null}
        {phase === 'abandoning' ? (
          <Button title="포기하는 중" variant="dangerOutline" loading />
        ) : null}
      </View>
    </AppBottomSheet>
  );
}

const STATE_LABEL = { done: '완료', now: '진행 중', failed: '실패', todo: '대기' } as const;
