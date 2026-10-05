import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { type UseQueryResult } from '@tanstack/react-query';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { ApiError } from '@/shared/api';
import {
  ActionBar,
  AppHeader,
  ConfirmSheet,
  ErrorState,
  Screen,
  showToast,
  SkeletonRows,
} from '@/shared/ui';

import { BROWSE_COPY } from '../model/browse';
import { EDIT_COPY } from '../model/edit-form';

export const useProductId = () => useLocalSearchParams<{ id: string }>().id;

export const leaveManage = () => (router.canGoBack() ? router.back() : router.replace('/products'));

interface FrameProps {
  title: string;
  onBack?: () => void;
  action?: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  /** 슬롯 박스를 끄는 동안 스크롤을 멈춘다 */
  scrollEnabled?: boolean;
  children: ReactNode;
}

/** 상품 관리 화면 틀: .hdr + 본문 스크롤(.body 20px) + 하단 단일 버튼(.actbar.one) */
export function ManageFrame({ title, onBack, action, scrollEnabled, children }: FrameProps) {
  return (
    <Screen edges={action ? ['top'] : ['top', 'bottom']}>
      <AppHeader title={title} onBack={onBack} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pb-8"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      {action ? <ActionBar primary={action} /> : null}
    </Screen>
  );
}

/** 로딩·오류 틀. 지워진 상품(NOT_FOUND)은 목록으로 돌려보낸다 */
export function ManageGate<T>({
  title,
  query,
  children,
}: {
  title: string;
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  const notFound = query.error instanceof ApiError && query.error.classification === 'NOT_FOUND';
  useEffect(() => {
    if (!notFound) return;
    showToast.error(BROWSE_COPY.notFound);
    leaveManage();
  }, [notFound]);

  if (query.data !== undefined) return children(query.data);
  return (
    <ManageFrame title={title}>
      {query.isPending || notFound ? (
        <SkeletonRows count={3} card />
      ) : (
        <ErrorState onRetry={() => void query.refetch()} />
      )}
    </ManageFrame>
  );
}

/** 값이 바뀐 채 나가면 확인한다(헤더·하드웨어 뒤로가기·iOS 스와이프) */
export function useLeaveGuard(dirty: boolean) {
  const sheet = useRef<BottomSheetModal>(null);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const back = useCallback(() => {
    if (dirtyRef.current) sheet.current?.present();
    else leaveManage();
    return true;
  }, []);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', back);
      return () => sub.remove();
    }, [back]),
  );

  const guard = (
    <>
      <Stack.Screen options={{ gestureEnabled: !dirty }} />
      <ConfirmSheet
        ref={sheet}
        title={EDIT_COPY.leaveTitle}
        description={EDIT_COPY.leaveDescription}
        cancelLabel={EDIT_COPY.leaveCancel}
        confirmLabel={EDIT_COPY.leaveConfirm}
        onConfirm={() => {
          sheet.current?.dismiss();
          leaveManage();
        }}
      />
    </>
  );
  return { back, guard };
}
