import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/features/home';

export function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmptyState title="주문 상세" message={`주문 #${id}의 내용을 불러옵니다.`} />;
}
