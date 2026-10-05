import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFound() {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-5">
      <Text className="font-sans text-lg font-semibold text-text">페이지를 찾을 수 없습니다</Text>
      <Link href="/" replace className="mt-4 font-sans text-md text-purple-text">
        홈으로
      </Link>
    </View>
  );
}
