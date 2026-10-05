import { type InfiniteData } from '@tanstack/react-query';

import { type CategoryType, type SellerProductsListQuery } from '@/graphql/generated/graphql';
import { formatKrw } from '@/shared/lib/format';

export type ProductListPage = SellerProductsListQuery['sellerProducts'];
export type ProductListItem = ProductListPage['items'][number];
export type ProductListData = InfiniteData<ProductListPage, string | null>;

export const BROWSE_COPY = {
  searchPlaceholder: '상품명·키워드 검색',
  allCategories: '전체',
  emptyTitle: '아직 등록한 상품이 없어요',
  emptyDescription: '첫 상품을 등록하면 구매자에게 매장이 보여요',
  emptyHiddenTitle: '숨긴 상품이 없어요',
  emptyFilteredTitle: '조건에 맞는 상품이 없어요',
  emptyFilteredDescription: '검색어나 카테고리를 바꿔 보세요',
  create: '상품 등록',
  deleteTitle: '상품을 삭제할까요?',
  deleteDescription:
    '구매자 화면에서 바로 사라지고 되돌릴 수 없어요.\n이미 들어온 주문은 그대로 유지돼요',
  deleted: '상품을 삭제했어요',
  notFound: '상품을 찾을 수 없어요',
  activeOn: '판매 중 · 구매자에게 보여요',
  activeOff: '숨김 · 구매자에게 보이지 않아요',
  noText: '입력하지 않았어요',
  buyerHiddenTitle: '구매자에게 보이지 않는 상품이에요',
  buyerHiddenDescription: '숨김 상품이거나 매장이 노출되지 않아 구매자 화면에서 열리지 않아요',
} as const;

/** 필터 칩: 이벤트 → 스타일, 각자 sortOrder 순. 그 밖(OTHER)은 등록 폼에서 고를 수 없어 뺀다 */
const CHIP_TYPES: readonly CategoryType[] = ['EVENT', 'STYLE'];

export function filterChipCategories<T extends { categoryType: CategoryType; sortOrder: number }>(
  categories: readonly T[],
): T[] {
  return CHIP_TYPES.flatMap((type) =>
    categories.filter((c) => c.categoryType === type).sort((a, b) => a.sortOrder - b.sortOrder),
  );
}

/** 할인가가 정가보다 작을 때만 할인으로 본다 */
export function priceView(regularPrice: number, salePrice: number | null | undefined) {
  const discounted = salePrice != null && salePrice < regularPrice;
  return {
    price: formatKrw(discounted ? salePrice : regularPrice),
    original: discounted ? formatKrw(regularPrice) : null,
    rate: discounted ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) : 0,
  };
}

export function formatPreparation(minutes: number): string {
  if (minutes <= 0) return '즉시 제작';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}시간` : '', m ? `${m}분` : ''].filter(Boolean).join(' ');
}

export function optionGroupSummary(group: {
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  isActive: boolean;
}): string {
  const { minSelect: min, maxSelect: max } = group;
  const count = min === max ? `${max}개 선택` : min > 0 ? `${min}~${max}개 선택` : `최대 ${max}개`;
  return [group.isRequired ? '필수' : '선택', count, group.isActive ? '' : '숨김']
    .filter(Boolean)
    .join(' · ');
}

function mapItems(
  data: ProductListData | undefined,
  fn: (items: ProductListItem[]) => ProductListItem[],
): ProductListData | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: fn(page.items) })) };
}

export const setActiveInList = (
  data: ProductListData | undefined,
  productId: string,
  isActive: boolean,
) => mapItems(data, (items) => items.map((p) => (p.id === productId ? { ...p, isActive } : p)));

export const removeFromList = (data: ProductListData | undefined, productId: string) =>
  mapItems(data, (items) => items.filter((p) => p.id !== productId));
