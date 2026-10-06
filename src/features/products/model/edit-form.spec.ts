import { type SellerProductDetailQuery } from '@/graphql/generated/graphql';

import {
  categoryIdsFor,
  type EditForm,
  editErrors,
  pendingSteps,
  toEditForm,
  toUpdateInput,
} from './edit-form';

const PRODUCT: SellerProductDetailQuery['sellerProduct'] = {
  id: '7',
  name: '그림일기 케이크',
  description: null,
  purchaseNotice: '흔들릴 수 있어요',
  regularPrice: 35000,
  salePrice: 33000,
  preparationTimeMinutes: 120,
  isActive: true,
  images: [],
  categories: [
    { id: 'c2', name: '입체' },
    { id: 'c9', name: '기타' },
    { id: 'c1', name: '크리스마스' },
  ],
  tags: [{ id: 't1', name: '눈' }],
  optionGroups: [],
  customTemplate: null,
};
const CATEGORIES = [
  { id: 'c1', categoryType: 'EVENT' as const },
  { id: 'c2', categoryType: 'STYLE' as const },
  { id: 'c9', categoryType: 'OTHER' as const },
];
const BASE = toEditForm(PRODUCT, CATEGORIES);

describe('toEditForm', () => {
  it('카테고리를 이벤트·스타일로 나누고 null 텍스트는 빈 문자열로 둔다', () => {
    expect(BASE).toEqual({
      name: '그림일기 케이크',
      regularPrice: '35000',
      salePrice: '33000',
      description: '',
      purchaseNotice: '흔들릴 수 있어요',
      preparationTime: '120',
      eventCategoryId: 'c1',
      styleCategoryId: 'c2',
      tags: ['눈'],
    });
  });

  it('할인가가 없으면 빈 칸, 목록에 없는 카테고리는 고르지 않은 것으로 본다', () => {
    expect(toEditForm({ ...PRODUCT, salePrice: null }, [])).toMatchObject({
      salePrice: '',
      eventCategoryId: null,
      styleCategoryId: null,
    });
  });
});

describe('editErrors', () => {
  it.each<[string, Partial<EditForm>, Record<string, string>]>([
    ['정상', {}, {}],
    ['상품명 공백', { name: '  ' }, { name: '상품명을 입력해 주세요' }],
    ['정가 없음', { regularPrice: '', salePrice: '' }, { regularPrice: '정가를 입력해 주세요' }],
    [
      '정가 상한 초과',
      { regularPrice: '1000000001', salePrice: '' },
      { regularPrice: '정가는 10억 원 이하로 입력해 주세요' },
    ],
    ['할인가 = 정가', { salePrice: '35000' }, { salePrice: '할인가는 정가보다 작아야 해요' }],
    ['할인가 > 정가', { salePrice: '38000' }, { salePrice: '할인가는 정가보다 작아야 해요' }],
    ['할인가 비움', { salePrice: '' }, {}],
    ['제작 시간 0', { preparationTime: '0' }, { preparationTime: '1분 이상 입력해 주세요' }],
    ['제작 시간 비움', { preparationTime: '' }, { preparationTime: '1분 이상 입력해 주세요' }],
  ])('%s', (_, patch, expected) => {
    expect(editErrors({ ...BASE, ...patch })).toEqual(expected);
  });
});

describe('toUpdateInput', () => {
  it('바뀌지 않았으면 빈 객체다', () => {
    expect(toUpdateInput(BASE, { ...BASE, name: ' 그림일기 케이크 ', description: '  ' })).toEqual(
      {},
    );
  });

  it('바뀐 필드만 담고 비운 텍스트·할인가는 null로 보낸다', () => {
    expect(
      toUpdateInput(BASE, {
        ...BASE,
        regularPrice: '36000',
        salePrice: '',
        purchaseNotice: ' ',
        preparationTime: '90',
      }),
    ).toEqual({
      regularPrice: 36000,
      salePrice: null,
      purchaseNotice: null,
      preparationTimeMinutes: 90,
    });
  });

  it('상품명·설명은 다듬어 보낸다', () => {
    expect(toUpdateInput(BASE, { ...BASE, name: ' 새 이름 ', description: ' 설명 ' })).toEqual({
      name: '새 이름',
      description: '설명',
    });
  });
});

describe('pendingSteps', () => {
  it('아무것도 안 바꾸면 단계가 없다', () => {
    expect(pendingSteps(BASE, BASE)).toEqual([]);
  });

  it('정보·카테고리·태그 순서로 바뀐 단계만 낸다', () => {
    const form = { ...BASE, name: '새 이름', styleCategoryId: null, tags: ['눈', '트리'] };
    expect(pendingSteps(BASE, form).map((s) => s.step)).toEqual(['info', 'categories', 'tags']);
  });

  it('카테고리·태그는 순서만 바뀌면 바뀐 것으로 보지 않는다', () => {
    const base = { ...BASE, tags: ['눈', '트리'] };
    expect(pendingSteps(base, { ...base, tags: ['트리', '눈'] })).toEqual([]);
  });

  it('성공한 단계의 값을 기준에 옮기면 그 단계는 다시 나오지 않는다', () => {
    const form = { ...BASE, name: '새 이름', tags: [] };
    const [info] = pendingSteps(BASE, form);
    expect(pendingSteps({ ...BASE, ...info?.applied }, form).map((s) => s.step)).toEqual(['tags']);
  });
});

describe('categoryIdsFor', () => {
  it('고른 이벤트·스타일 뒤에 고를 수 없는 기존 연결을 보존한다', () => {
    expect(categoryIdsFor({ ...BASE, eventCategoryId: null }, PRODUCT, CATEGORIES)).toEqual([
      'c2',
      'c9',
    ]);
  });
});
