import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/features/home';

function useProductId(): string {
  return useLocalSearchParams<{ id: string }>().id;
}

export function ProductEditScreen() {
  return <EmptyState title="상품 수정" message={`상품 #${useProductId()}의 정보를 수정합니다.`} />;
}

export function ProductImagesScreen() {
  return <EmptyState title="상품 이미지" message="이미지를 추가하고 순서를 바꿉니다." />;
}

export function ProductOptionsScreen() {
  return <EmptyState title="옵션 편집" message="옵션 그룹과 항목을 바로 저장합니다." />;
}

export function ProductCustomTemplateScreen() {
  return <EmptyState title="커스텀 템플릿" message="베이스 이미지 위에 문구 슬롯을 배치합니다." />;
}
