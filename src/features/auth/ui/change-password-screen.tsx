import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, isForbiddenCode, messageFor } from '@/shared/api';
import { colors } from '@/shared/config/tokens';
import { Icon, showToast } from '@/shared/ui';

import { AUTH_COPY } from '../model/messages';
import { type ChangePasswordValues, changePasswordSchema } from '../model/password-rules';
import { changePassword, logout } from '../model/session';
import { useSessionStore } from '../model/session-store';
import { AuthField, SubmitButton } from './form-field';

const FIELDS: { name: keyof ChangePasswordValues; label: string; hint?: string }[] = [
  { name: 'currentPassword', label: '현재 비밀번호' },
  { name: 'newPassword', label: '새 비밀번호', hint: AUTH_COPY.passwordRule },
  { name: 'confirmPassword', label: '새 비밀번호 확인' },
];

/** 서버가 특정 입력을 짚는 코드 — 폼 상단이 아니라 그 칸 아래에 표시한다 */
const FIELD_BY_CODE: Record<string, keyof ChangePasswordValues> = {
  CURRENT_PASSWORD_INVALID: 'currentPassword',
  PASSWORD_UNCHANGED: 'newPassword',
};

/** (auth)/change-password(초기 비밀번호 강제)와 settings/change-password(자발) 둘 다 이 화면 */
export function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const forced = useSessionStore((s) => s.mustChangePassword);
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // 강제 변경에서 빠져나갈 길은 '다른 계정으로 로그인'뿐이다
  useEffect(() => {
    if (!forced) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [forced]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      showToast.success(AUTH_COPY.passwordChanged);
      router.replace('/login');
    } catch (e) {
      // 정지·계정 유형 403은 세션 훅이 정리·안내한다
      if (e instanceof ApiError && isForbiddenCode(e.code)) return;
      // refresh까지 실패해 세션을 잃었으면 폼 대신 로그인으로
      if (useSessionStore.getState().status === 'anonymous') {
        showToast.error(messageFor(e));
        router.replace('/login');
        return;
      }
      const field = e instanceof ApiError ? FIELD_BY_CODE[e.code ?? ''] : undefined;
      if (field) form.setError(field, { message: messageFor(e) });
      else showToast.error(messageFor(e));
    }
  });

  const switchAccount = async () => {
    await logout();
    router.replace('/login');
  };

  const { errors, isSubmitting } = form.formState;
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {forced ? (
        <View style={{ paddingTop: insets.top + 8 }}>
          <Text
            accessibilityRole="header"
            className="h-11 text-center font-sans text-2xl font-bold leading-[44px] tracking-tighter text-text3"
          >
            비밀번호 변경
          </Text>
        </View>
      ) : null}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-6">
        {forced ? (
          // 화면 바탕(bg)과 거의 같은 tint2(대비 1.03:1) 대신 tint로 — 첫 화면에서 바로 눈에 띄어야 한다
          <View
            testID="forced-notice"
            accessible
            className="mt-6 flex-row gap-2.5 rounded-lg bg-tint px-4 py-3.5"
          >
            <Icon name="alert" size={18} color={colors.primaryStrong} />
            <View className="flex-1 gap-1">
              <Text className="font-sans text-md font-semibold leading-[20px] tracking-tight text-text3">
                {AUTH_COPY.forcedTitle}
              </Text>
              <Text className="font-sans text-sm leading-[19px] tracking-tight text-label">
                {AUTH_COPY.forcedBody}
              </Text>
            </View>
          </View>
        ) : null}
        <View className={forced ? 'mt-[18px] gap-[18px]' : 'mt-[38px] gap-[18px]'}>
          {FIELDS.map((f) => (
            <Controller
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <AuthField
                  label={f.label}
                  secret
                  autoComplete={f.name === 'currentPassword' ? 'current-password' : 'new-password'}
                  returnKeyType={f.name === 'confirmPassword' ? 'done' : 'next'}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  hint={f.hint}
                  error={errors[f.name]?.message}
                />
              )}
            />
          ))}
        </View>
        {forced ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void switchAccount()}
            className="mt-7 h-11 items-center justify-center self-center px-2"
          >
            <Text className="font-sans text-base font-medium tracking-tight text-primary-strong">
              다른 계정으로 로그인
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <View className="bg-surface px-3.5 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <SubmitButton label="변경하기" busy={isSubmitting} onPress={() => void submit()} />
      </View>
    </KeyboardAvoidingView>
  );
}
