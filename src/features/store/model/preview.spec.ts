import { ALL_CATEGORIES, previewTabs, priceText } from './preview';

it('카테고리 탭은 전체 + 상품 있는 것만 노출 순서대로', () => {
  expect(
    previewTabs([
      { id: '2', name: '크리스마스', sortOrder: 2, productCount: 3 },
      { id: '9', name: '빈 카테고리', sortOrder: 0, productCount: 0 },
      { id: '1', name: '생일', sortOrder: 1, productCount: 5 },
    ]),
  ).toEqual([
    { value: ALL_CATEGORIES, label: '전체' },
    { value: '1', label: '생일' },
    { value: '2', label: '크리스마스' },
  ]);
});

it.each([
  [33000, null, { price: '33,000원', original: null }],
  [35000, 33000, { price: '33,000원', original: '35,000원' }],
  [33000, 33000, { price: '33,000원', original: null }],
  [33000, 0, { price: '0원', original: '33,000원' }],
])('priceText(%i, %j)', (regular, sale, expected) => {
  expect(priceText(regular, sale)).toEqual(expected);
});
