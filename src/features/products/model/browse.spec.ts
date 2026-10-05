import {
  type ProductListData,
  type ProductListItem,
  filterChipCategories,
  formatPreparation,
  optionGroupSummary,
  priceView,
  removeFromList,
  setActiveInList,
} from './browse';

const item = (id: string, isActive = true): ProductListItem => ({
  id,
  name: `상품 ${id}`,
  regularPrice: 10000,
  salePrice: null,
  isActive,
  images: [],
  categories: [],
});

const pages = (...ids: string[][]): ProductListData => ({
  pageParams: ids.map((_, i) => (i === 0 ? null : `c${i}`)),
  pages: ids.map((group) => ({
    items: group.map((id) => item(id)),
    totalCount: 3,
    hasMore: false,
    nextCursor: null,
  })),
});

describe('filterChipCategories', () => {
  it('이벤트 다음 스타일, 각자 sortOrder 순으로 두고 OTHER는 뺀다', () => {
    const result = filterChipCategories([
      { id: 's2', categoryType: 'STYLE', sortOrder: 2 },
      { id: 'o1', categoryType: 'OTHER', sortOrder: 0 },
      { id: 'e2', categoryType: 'EVENT', sortOrder: 2 },
      { id: 's1', categoryType: 'STYLE', sortOrder: 1 },
      { id: 'e1', categoryType: 'EVENT', sortOrder: 1 },
    ] as const);
    expect(result.map((c) => c.id)).toEqual(['e1', 'e2', 's1', 's2']);
  });
});

describe('priceView', () => {
  it.each<[number, number | null, string, string | null, number]>([
    [35000, 33000, '33,000원', '35,000원', 6],
    [35000, null, '35,000원', null, 0],
    // 반증: 할인가가 정가 이상이면 할인으로 보지 않는다
    [35000, 35000, '35,000원', null, 0],
    [35000, 38000, '35,000원', null, 0],
    [10000, 0, '0원', '10,000원', 100],
  ])('정가 %d · 할인가 %s → %s / %s / %d%%', (regular, sale, price, original, rate) => {
    expect(priceView(regular, sale)).toEqual({ price, original, rate });
  });
});

describe('formatPreparation', () => {
  it.each([
    [0, '즉시 제작'],
    [45, '45분'],
    [120, '2시간'],
    [150, '2시간 30분'],
  ])('%d분 → %s', (minutes, text) => {
    expect(formatPreparation(minutes)).toBe(text);
  });
});

describe('optionGroupSummary', () => {
  it.each([
    [{ isRequired: true, minSelect: 1, maxSelect: 1, isActive: true }, '필수 · 1개 선택'],
    [{ isRequired: true, minSelect: 1, maxSelect: 3, isActive: true }, '필수 · 1~3개 선택'],
    [{ isRequired: false, minSelect: 0, maxSelect: 2, isActive: true }, '선택 · 최대 2개'],
    [{ isRequired: false, minSelect: 0, maxSelect: 2, isActive: false }, '선택 · 최대 2개 · 숨김'],
  ])('%o → %s', (group, text) => {
    expect(optionGroupSummary(group)).toBe(text);
  });
});

describe('목록 캐시 갱신', () => {
  it('모든 페이지에서 해당 상품의 노출만 바꾼다', () => {
    const next = setActiveInList(pages(['1', '2'], ['3']), '3', false);
    expect(next?.pages.flatMap((p) => p.items.map((i) => [i.id, i.isActive]))).toEqual([
      ['1', true],
      ['2', true],
      ['3', false],
    ]);
  });

  it('삭제한 상품을 모든 페이지에서 뺀다', () => {
    const next = removeFromList(pages(['1', '2'], ['3']), '2');
    expect(next?.pages.map((p) => p.items.map((i) => i.id))).toEqual([['1'], ['3']]);
  });

  it('캐시가 없으면 그대로 둔다', () => {
    expect(setActiveInList(undefined, '1', false)).toBeUndefined();
  });
});
