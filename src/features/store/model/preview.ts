import { formatKrw } from '@/shared/lib/format';

export const PREVIEW_COPY = {
  banner: '구매자에게 보이는 화면입니다',
  hiddenTitle: '매장이 비공개 상태예요',
  hiddenDescription: '구매자에게 매장이 보이지 않아 미리볼 수 없어요',
  noProducts: '구매자에게 보이는 상품이 없어요',
  productHidden: '구매자에게 보이지 않는 상품이에요',
  all: '전체',
} as const;

export const ALL_CATEGORIES = 'all';

/** '전체' + 상품이 있는 카테고리만, 노출 순서대로 */
export function previewTabs(
  categories: readonly { id: string; name: string; sortOrder: number; productCount: number }[],
) {
  return [
    { value: ALL_CATEGORIES, label: PREVIEW_COPY.all },
    ...categories
      .filter((c) => c.productCount > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ value: c.id, label: c.name })),
  ];
}

/** 표시가: 할인가가 있으면 할인가 */
export function priceText(regularPrice: number, salePrice?: number | null) {
  return {
    price: formatKrw(salePrice ?? regularPrice),
    original: salePrice != null && salePrice < regularPrice ? formatKrw(regularPrice) : null,
  };
}
