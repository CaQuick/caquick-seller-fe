import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/features/home';

export { StoreBasicInfoScreen } from './basic-info-screen';
export { StoreBusinessHoursScreen } from './business-hours-screen';
export { StoreDailyCapacitiesScreen } from './daily-capacities-screen';
export { StorePickupPolicyScreen } from './pickup-policy-screen';
export { StoreSpecialClosuresScreen } from './special-closures-screen';
export { StoreMenuScreen } from './store-menu-screen';

export function StoreFaqListScreen() {
  return (
    <EmptyState
      title="FAQ가 없습니다"
      message="자주 묻는 질문을 등록하면 채팅에서 자동으로 안내합니다."
    />
  );
}

export function StoreFaqEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EmptyState
      title={id === 'new' ? 'FAQ 추가' : 'FAQ 수정'}
      message="질문과 답변을 입력합니다."
    />
  );
}

export function StorePreviewScreen() {
  return <EmptyState title="구매자 화면 미리보기" message="구매자에게 보이는 매장 화면입니다." />;
}

export function StoreAuditLogsScreen() {
  return (
    <EmptyState
      title="조작 이력이 없습니다"
      message="매장·상품·주문 변경 기록이 여기에 쌓입니다."
    />
  );
}
