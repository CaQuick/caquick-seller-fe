import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title: string;
  description: string;
  children: ReactNode;
}

/** 로그인·비밀번호 변경처럼 탭·헤더 밖에서 단독으로 뜨는 화면의 틀 */
export function AuthShell({ title, description, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }}
        className="px-5"
      >
        <Text className="font-sans text-sm font-semibold tracking-tight text-purple-text">
          케이퀵 판매자
        </Text>
        <Text className="mt-2 font-sans text-5xl font-bold tracking-tighter text-text">
          {title}
        </Text>
        <Text className="mt-2 font-sans text-base text-muted">{description}</Text>
        <View className="mt-8 gap-4">{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
