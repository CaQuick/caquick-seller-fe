import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/features/home';

export function ReviewsScreen() {
  return <EmptyState title="리뷰가 없습니다" message="구매자가 남긴 리뷰가 여기에 표시됩니다." />;
}

export function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmptyState title="리뷰 상세" message={`리뷰 #${id}의 내용을 불러옵니다.`} />;
}
