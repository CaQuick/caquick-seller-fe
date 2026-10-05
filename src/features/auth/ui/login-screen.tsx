import { zodResolver } from '@hookform/resolvers/zod';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, messageFor } from '@/shared/api';

import { type LoginValues, loginSchema } from '../model/password-rules';
import { login } from '../model/session';
import { useSessionStore } from '../model/session-store';
import { AuthField, SubmitButton } from './form-field';
import logo from './caquick-logo.png';

interface Failure {
  code: string | null;
  message: string;
}

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [failure, setFailure] = useState<Failure | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await login(values.username, values.password);
      router.replace(useSessionStore.getState().mustChangePassword ? '/change-password' : '/');
    } catch (e) {
      setFailure({ code: e instanceof ApiError ? e.code : null, message: messageFor(e) });
    }
  });

  // 입력을 고치면 오류·잠금 표시를 거둔다 — 앱은 잠금 해제 시각을 모른다
  const edit = (onChange: (v: string) => void) => (v: string) => {
    setFailure(null);
    onChange(v);
  };
  const invalid = failure?.code === 'INVALID_CREDENTIALS';
  const { errors, isSubmitting } = form.formState;
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="grow px-6"
        contentContainerStyle={{ paddingTop: insets.top + 72 }}
      >
        <Image source={logo} accessibilityLabel="케이퀵" style={{ width: 86, height: 38 }} />
        <Text className="text-text-2 mt-[18px] font-sans text-5xl font-bold leading-[32px] tracking-tighter">
          판매자 로그인
        </Text>
        <Text className="mt-1.5 font-sans text-base tracking-tight text-muted">
          관리자에게 받은 매장 계정으로 로그인해 주세요
        </Text>
        <View className="mt-9 gap-5">
          <Controller
            control={form.control}
            name="username"
            render={({ field }) => (
              <AuthField
                label="아이디"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                value={field.value}
                onChangeText={edit(field.onChange)}
                onBlur={field.onBlur}
                invalid={invalid}
                error={errors.username?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="password"
            render={({ field }) => (
              <AuthField
                label="비밀번호"
                secret
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                value={field.value}
                onChangeText={edit(field.onChange)}
                onBlur={field.onBlur}
                invalid={invalid}
                error={errors.password?.message ?? failure?.message}
              />
            )}
          />
        </View>
        <View className="mt-6">
          <SubmitButton
            label="로그인"
            busyLabel="로그인 중…"
            busy={isSubmitting}
            locked={failure?.code === 'LOGIN_RATE_LIMITED'}
            onPress={() => void submit()}
          />
        </View>
        <Text className="mt-[18px] text-center font-sans text-sm tracking-tight text-muted">
          계정 발급·비밀번호 초기화는 관리자에게 문의해 주세요
        </Text>
        <Text
          className="mt-auto pt-6 text-center font-sans text-xs text-placeholder"
          style={{ paddingBottom: insets.bottom + 36 }}
        >
          케이퀵 판매자 {Constants.expoConfig?.version}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
