import { type BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { AppBottomSheet, Button } from '@/shared/ui';

import {
  DEV_LOGIN_COPY,
  type TapState,
  accountIdSchema,
  countTap,
  devLogin,
  devLoginMessage,
} from '../model/dev-login';

function DevLoginSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<BottomSheetModal>(null);
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => ref.current?.present(), []);

  const submit = async () => {
    const parsed = accountIdSchema.safeParse(accountId);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await devLogin(parsed.data);
      router.replace('/');
    } catch (e) {
      setError(devLoginMessage(e));
      setBusy(false);
    }
  };

  return (
    <AppBottomSheet ref={ref} title={DEV_LOGIN_COPY.title} onDismiss={onClose}>
      <Text className="mb-5 font-sans text-base tracking-tight text-muted">
        {DEV_LOGIN_COPY.description}
      </Text>
      <Text className="mb-2 font-sans text-base font-semibold tracking-tight text-text2">
        {DEV_LOGIN_COPY.label}
      </Text>
      <View
        style={shadow.native.field}
        className={cn(
          'h-12 flex-row items-center rounded-sm border bg-surface px-3',
          error ? 'border-danger' : 'border-border',
        )}
      >
        <BottomSheetTextInput
          accessibilityLabel={DEV_LOGIN_COPY.label}
          keyboardType="number-pad"
          returnKeyType="done"
          value={accountId}
          onChangeText={(v) => {
            setError(null);
            setAccountId(v);
          }}
          onSubmitEditing={() => void submit()}
          placeholder="예) 12"
          placeholderTextColor={colors.placeholder}
          cursorColor={colors.caret}
          selectionColor={colors.caret}
          className="flex-1 font-sans text-lg tracking-tight text-ink"
        />
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-1.5 font-sans text-xs text-danger">
          {error}
        </Text>
      ) : null}
      <View className="mt-6 flex-row gap-2">
        <View style={{ flex: 1 }}>
          <Button title="닫기" variant="secondary" onPress={() => ref.current?.dismiss()} />
        </View>
        <View style={{ flex: 1.62 }}>
          <Button title={DEV_LOGIN_COPY.submit} loading={busy} onPress={() => void submit()} />
        </View>
      </View>
    </AppBottomSheet>
  );
}

/** 로고를 연속으로 누르면 개발용 로그인 시트를 연다. 개발 빌드에서만 그린다 */
export function DevLoginEntry({ children }: { children: ReactNode }) {
  const taps = useRef<TapState>({ count: 0, at: 0 });
  const [open, setOpen] = useState(false);
  const tap = () => {
    const { next, open: reached } = countTap(taps.current, Date.now());
    taps.current = next;
    if (reached) setOpen(true);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="케이퀵 로고"
        accessibilityHint="다섯 번 누르면 개발용 로그인을 엽니다"
        hitSlop={{ top: 3, bottom: 3 }}
        onPress={tap}
        className="self-start"
      >
        {children}
      </Pressable>
      {open ? <DevLoginSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
