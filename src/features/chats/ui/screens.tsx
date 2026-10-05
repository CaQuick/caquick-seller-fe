import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/features/home';

export function ChatsScreen() {
  return <EmptyState title="문의가 없습니다" message="구매자 문의가 오면 여기에 표시됩니다." />;
}

export function ChatRoomScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  return <EmptyState title="대화" message={`대화 #${conversationId}의 메시지를 불러옵니다.`} />;
}
