import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';

import { messageFor } from '@/shared/api';

import { type LoginValues, loginSchema } from '../model/password-rules';
import { login } from '../model/session';
import { useSessionStore } from '../model/session-store';
import { AuthShell } from './auth-shell';
import { FormError, FormField, SubmitButton } from './form-field';

export function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await login(values.username, values.password);
      router.replace(useSessionStore.getState().mustChangePassword ? '/change-password' : '/');
    } catch (e) {
      setError(messageFor(e));
    }
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <AuthShell title="로그인" description="판매자 계정으로 로그인합니다.">
      <FormError message={error} />
      <Controller
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormField
            label="아이디"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.username?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormField
            label="비밀번호"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.password?.message}
          />
        )}
      />
      <SubmitButton label="로그인" busy={isSubmitting} onPress={() => void submit()} />
      <Text className="mt-2 text-center font-sans text-xs text-muted">
        첫 로그인이거나 비밀번호가 초기화된 계정은 로그인 직후 비밀번호를 변경합니다.
      </Text>
    </AuthShell>
  );
}
