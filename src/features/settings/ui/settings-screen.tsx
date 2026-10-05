import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { logout } from '@/features/auth';

/** 계정·앱 정보·로그아웃. 버전·업데이트·알림 권한 표시는 후속 */
export function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-5 py-4 gap-3">
      <View className="rounded-xl border border-line bg-surface">
        <Link href="/settings/change-password" asChild>
          <Pressable
            accessibilityRole="button"
            className="active:bg-gray-2 h-14 flex-row items-center justify-between px-4"
          >
            <Text className="font-sans text-md font-medium text-text">비밀번호 변경</Text>
            <Text className="font-sans text-lg text-chevron">›</Text>
          </Pressable>
        </Link>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void logout()}
        className="active:bg-gray-2 h-12 items-center justify-center rounded-sm border border-border bg-surface"
      >
        <Text className="font-sans text-md font-medium text-danger">로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}
