import { threeDCategoryLabel } from '@/features/custom';
import { type CustomModeType, type SellerProductDetailQuery } from '@/graphql/generated/graphql';
import { enumView } from '@/shared/lib/enum-view';
import { withJosa } from '@/shared/lib/josa';

type Product = Pick<
  SellerProductDetailQuery['sellerProduct'],
  'customMode' | 'customReadiness' | 'customTemplate' | 'optionGroups'
>;

export const customModeLabel = enumView(
  { NONE: '없음', SLOT: '슬롯형', THREE_D: '3D' } satisfies Record<CustomModeType, string>,
  '확인 필요',
);

export const CUSTOMIZATION_COPY = {
  title: '커스텀 방식',
  guide: '커스텀 방식이 있는 상품은 구매자가 꾸미기를 마쳐야 주문할 수 있어요. 건너뛸 수 없어요',
  inUse: '사용 중',
  notReady: '아래 항목을 마치면 고를 수 있어요',
  brokenNow: '지금 상태로는 구매자 주문이 거절돼요',
  changed: (mode: CustomModeType) =>
    `커스텀 방식을 ${withJosa(customModeLabel(mode), '으로/로')} 바꿨어요`,
  slotSettings: '슬롯형 설정',
  optionSettings: '옵션 편집',
  noFreeEdit: '3D 상품에는 자유 편집이 없어요',
  preset: '3D 기본 세트 불러오기',
  presetHint:
    '크기·맛·모양은 꼭 고르는 그룹, 디자인은 고르지 않아도 되는 그룹으로 만들어요. 이미 있는 3D 그룹은 그대로 둬요. 새 그룹은 켜진 채로 생겨 노출 중인 상품이면 구매자에게 바로 보여요',
  presetDone: '3D 기본 세트를 불러왔어요',
  unknownMode: '앱을 최신 버전으로 업데이트하면 볼 수 있어요',
} as const;

export const MODE_CARDS: readonly { mode: CustomModeType; description: string }[] = [
  { mode: 'NONE', description: '구매자는 옵션만 고르고 주문해요' },
  {
    mode: 'SLOT',
    description:
      '바탕 이미지 위 문구 자리에 구매자가 문구를 넣어요. 자유 편집은 상품별로 켤 수 있어요',
  },
  { mode: 'THREE_D', description: '구매자가 모양·크기·맛·디자인 옵션으로 3D 케이크를 꾸며요' },
];

export const modeIssues = (product: Product, mode: CustomModeType) =>
  product.customReadiness.find((r) => r.mode === mode)?.issues.map((i) => i.message) ?? [];

/** 방식별 준비 현황 한 줄 */
export function modeSummary(product: Product, mode: CustomModeType): string | null {
  if (mode === 'SLOT') {
    const template = product.customTemplate;
    if (!template) return '바탕 이미지를 아직 올리지 않았어요';
    return `문구 자리 ${template.textTokens.length}개 · 자유 편집 ${template.freeEditEnabled ? '켬' : '끔'}`;
  }
  if (mode === 'THREE_D') {
    const categories = product.optionGroups.flatMap((g) =>
      g.isActive && g.threeDCategory ? [threeDCategoryLabel(g.threeDCategory)] : [],
    );
    return categories.length > 0
      ? `3D 항목 옵션: ${categories.join('·')}`
      : '3D 항목에 연결한 옵션 그룹이 없어요';
  }
  return null;
}

/** 상품 상세의 '커스텀 방식' 행 설명 */
export function modeRowDescription(product: Product): string {
  const mode = product.customMode;
  if (modeIssues(product, mode).length > 0) return CUSTOMIZATION_COPY.brokenNow;
  if (mode === 'NONE') return MODE_CARDS[0]!.description;
  return modeSummary(product, mode) ?? CUSTOMIZATION_COPY.unknownMode;
}
