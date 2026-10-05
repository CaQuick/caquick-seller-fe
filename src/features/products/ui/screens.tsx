import { Stack, useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/features/home';
import { colors, fontFamily, fontWeight } from '@/shared/config/tokens';

/** 등록 3단계 Stack. 뒤로가기 제스처를 꺼 단계 밖으로 새지 않게 한다 */
export function ProductNewLayout() {
  return (
    <Stack
      screenOptions={{
        gestureEnabled: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontFamily, fontWeight: fontWeight.semibold, color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="basic" options={{ title: '상품 등록 1/3' }} />
      <Stack.Screen name="options" options={{ title: '상품 등록 2/3' }} />
      <Stack.Screen name="preview" options={{ title: '상품 등록 3/3' }} />
    </Stack>
  );
}

export function ProductNewBasicScreen() {
  return <EmptyState title="기본 정보" message="사진·이름·가격·카테고리·태그를 입력합니다." />;
}

export function ProductNewOptionsScreen() {
  return <EmptyState title="옵션" message="옵션 그룹과 항목, 추가 금액을 설정합니다." />;
}

export function ProductNewPreviewScreen() {
  return <EmptyState title="미리보기" message="구매자에게 보이는 모습을 확인하고 등록합니다." />;
}

function useProductId(): string {
  return useLocalSearchParams<{ id: string }>().id;
}

export function ProductDetailScreen() {
  return <EmptyState title="상품 상세" message={`상품 #${useProductId()}의 내용을 불러옵니다.`} />;
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
