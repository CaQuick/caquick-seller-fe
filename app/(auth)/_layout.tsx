import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/features/auth';

/** 로그인·강제 비밀번호 변경. 이미 로그인된 계정은 앱으로 보낸다 */
export default function AuthLayout() {
  const status = useSessionStore((s) => s.status);
  const mustChangePassword = useSessionStore((s) => s.mustChangePassword);
  if (status === 'unknown') return null;
  if (status === 'authenticated' && !mustChangePassword) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Protected guard={status === 'authenticated'}>
        <Stack.Screen name="change-password" options={{ gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}
