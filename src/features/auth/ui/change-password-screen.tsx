import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';

import { messageFor } from '@/shared/api';
import { showToast } from '@/shared/ui';

import { type ChangePasswordValues, changePasswordSchema } from '../model/password-rules';
import { changePassword } from '../model/session';
import { useSessionStore } from '../model/session-store';
import { AuthShell } from './auth-shell';
import { FormError, FormField, SubmitButton } from './form-field';

const FIELDS: { name: keyof ChangePasswordValues; label: string }[] = [
  { name: 'currentPassword', label: '현재 비밀번호' },
  { name: 'newPassword', label: '새 비밀번호' },
  { name: 'confirmPassword', label: '새 비밀번호 확인' },
];

/** (auth)/change-password(강제)와 settings/change-password(자발) 둘 다 이 화면 */
export function ChangePasswordScreen() {
  const forced = useSessionStore((s) => s.mustChangePassword);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      showToast.success('비밀번호를 변경했습니다. 다시 로그인해 주세요.');
      router.replace('/login');
    } catch (e) {
      // refresh까지 실패해 세션을 잃었으면 폼 대신 로그인으로
      if (useSessionStore.getState().status === 'anonymous') {
        showToast.error(messageFor(e));
        router.replace('/login');
      } else {
        setError(messageFor(e));
      }
    }
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <AuthShell
      title="비밀번호 변경"
      description={
        forced ? '계속하려면 먼저 비밀번호를 바꿔야 합니다.' : '새 비밀번호를 설정합니다.'
      }
    >
      <FormError message={error} />
      {FIELDS.map((f) => (
        <Controller
          key={f.name}
          control={form.control}
          name={f.name}
          render={({ field }) => (
            <FormField
              label={f.label}
              secureTextEntry
              autoComplete={f.name === 'currentPassword' ? 'current-password' : 'new-password'}
              returnKeyType={f.name === 'confirmPassword' ? 'done' : 'next'}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors[f.name]?.message}
            />
          )}
        />
      ))}
      <Text className="font-sans text-xs text-muted">
        8~64자로, 알파벳·숫자·특수문자를 각각 1자 이상 넣어 주세요. 변경하면 다시 로그인해야 합니다.
      </Text>
      <SubmitButton label="비밀번호 변경" busy={isSubmitting} onPress={() => void submit()} />
    </AuthShell>
  );
}
