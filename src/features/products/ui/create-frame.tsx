import { Stack } from 'expo-router';
import { type ComponentProps, type ReactNode, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { ActionBar, AppHeader, Screen, showToast, StepProgress } from '@/shared/ui';

import { CREATE_COPY } from '../model/draft-form';
import { saveDraft, useDraftStore } from '../model/draft-store';

/** 등록 3단계 Stack. 뒤로가기 제스처를 꺼 단계 밖으로 새지 않게 하고, Stack이 내려가면 초안을 비운다 */
export function ProductNewLayout() {
  useEffect(() => () => useDraftStore.getState().reset(), []);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}

interface FrameProps {
  step: 1 | 2 | 3;
  label: string;
  onBack: () => void;
  actions: ComponentProps<typeof ActionBar>;
  children: ReactNode;
}

/** .hdr '상품 등록' + .step 진행 표시 + 본문 스크롤 + 하단 .actbar */
export function CreateFrame({ step, label, onBack, actions, children }: FrameProps) {
  return (
    <Screen edges={['top']}>
      <AppHeader title={CREATE_COPY.title} onBack={onBack} />
      <StepProgress step={step} label={label} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-8">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      <ActionBar {...actions} />
    </Screen>
  );
}

export async function saveDraftWithToast(accountId: string | undefined) {
  const ok =
    accountId !== undefined && (await saveDraft(accountId, useDraftStore.getState().draft));
  if (ok) showToast.success(CREATE_COPY.draftSaved);
  else showToast.error(CREATE_COPY.draftSaveFailed);
}
