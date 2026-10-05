import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/features/home';

import { StoreMenuScreen } from './store-menu-screen';

export { StoreMenuScreen };

export function StoreBasicInfoScreen() {
  return <EmptyState title="기본 정보" message="매장 이름·소개·로고·주소를 수정합니다." />;
}

export function StoreBusinessHoursScreen() {
  return <EmptyState title="영업시간" message="요일별 영업시간을 설정합니다." />;
}

export function StoreSpecialClosuresScreen() {
  return <EmptyState title="특별휴무" message="달력에서 쉬는 날을 고릅니다." />;
}

export function StorePickupPolicyScreen() {
  return <EmptyState title="픽업 정책" message="최소 준비 시간과 픽업 가능 범위를 정합니다." />;
}

export function StoreDailyCapacitiesScreen() {
  return <EmptyState title="일별 생산 수량" message="날짜별로 받을 수 있는 주문 수를 정합니다." />;
}

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
