import {
  addTag,
  basicErrors,
  categoryIds,
  MAX_TAGS,
  normalizeTag,
  priceText,
  toCreateInput,
  toDigits,
} from './draft-form';
import { type DraftImage, EMPTY_DRAFT, type ProductDraft } from './draft-store';

const done = (n: number): DraftImage => ({
  key: `k${n}`,
  uri: `https://cdn.test/${n}.jpg`,
  source: null,
  publicUrl: `https://cdn.test/${n}.jpg`,
  status: 'done',
});

const READY: ProductDraft = {
  ...EMPTY_DRAFT,
  images: [done(1), done(2)],
  name: ' 그림일기 케이크 ',
  regularPrice: '35000',
  salePrice: '33000',
};

describe('가격 입력', () => {
  it.each([
    ['35,000', '35000'],
    ['0035', '35'],
    ['0', '0'],
    ['abc', ''],
    ['1,2a3', '123'],
  ])('%s → 숫자 %s', (input, digits) => {
    expect(toDigits(input)).toBe(digits);
  });

  it('숫자를 천단위로 보여주고 빈 값은 비워 둔다', () => {
    expect(priceText('1234567')).toBe('1,234,567');
    expect(priceText('')).toBe('');
  });
});

describe('basicErrors', () => {
  it('필수값(이미지 1·상품명·정가)이 차면 오류가 없다', () => {
    expect(basicErrors(READY)).toEqual({});
  });

  it.each<[string, Partial<ProductDraft>, Record<string, string>]>([
    ['이미지 없음', { images: [] }, { images: '이미지를 1장 이상 올려 주세요' }],
    [
      '업로드 중',
      { images: [done(1), { ...done(2), status: 'uploading', publicUrl: null }] },
      { images: '이미지를 올리는 중이에요. 끝나면 넘어갈 수 있어요' },
    ],
    [
      '업로드 실패',
      { images: [{ ...done(1), status: 'failed', publicUrl: null }] },
      { images: '올리지 못한 이미지를 다시 시도하거나 지워 주세요' },
    ],
    ['공백 상품명', { name: '   ' }, { name: '상품명을 입력해 주세요' }],
    ['정가 없음', { regularPrice: '', salePrice: '' }, { regularPrice: '정가를 입력해 주세요' }],
    ['정가 0원', { regularPrice: '0', salePrice: '' }, { regularPrice: '정가를 입력해 주세요' }],
    [
      '정가 10억 초과',
      { regularPrice: '1000000001', salePrice: '' },
      { regularPrice: '정가는 10억 원 이하로 입력해 주세요' },
    ],
    ['할인가 = 정가', { salePrice: '35000' }, { salePrice: '할인가는 정가보다 낮아야 해요' }],
    ['할인가 > 정가', { salePrice: '36000' }, { salePrice: '할인가는 정가보다 낮아야 해요' }],
  ])('%s', (_, patch, expected) => {
    expect(basicErrors({ ...READY, ...patch })).toEqual(expected);
  });

  it('할인가는 비워 두거나 0원(무료)일 수 있다', () => {
    expect(basicErrors({ ...READY, salePrice: '' })).toEqual({});
    expect(basicErrors({ ...READY, salePrice: '0' })).toEqual({});
  });
});

describe('태그', () => {
  it.each([
    ['  #눈  ', '눈'],
    ['##Snow', 'snow'],
    ['크리스마스   트리', '크리스마스 트리'],
    ['#', null],
    ['   ', null],
  ])('normalizeTag(%j) → %j', (raw, expected) => {
    expect(normalizeTag(raw)).toBe(expected);
  });

  it('정규화한 이름으로 붙이고 같은 이름은 다시 붙이지 않는다', () => {
    expect(addTag(['눈'], '#Tree')).toEqual({ tags: ['눈', 'tree'], error: null });
    expect(addTag(['눈'], '#눈')).toEqual({ tags: ['눈'], error: null });
  });

  it('20개를 넘기면 붙이지 않고 문구를 준다', () => {
    const full = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`);
    expect(addTag(full.slice(1), 'new').tags).toHaveLength(MAX_TAGS);
    expect(addTag(full, 'new')).toEqual({
      tags: full,
      error: '키워드는 최대 20개까지 등록할 수 있어요',
    });
  });

  it('80자를 넘는 이름은 붙이지 않는다', () => {
    expect(addTag([], 'a'.repeat(80)).tags).toEqual(['a'.repeat(80)]);
    expect(addTag([], 'a'.repeat(81))).toEqual({
      tags: [],
      error: '키워드는 80자까지 입력할 수 있어요',
    });
  });
});

describe('toCreateInput', () => {
  it('숨김으로 만들고 첫 장을 대표 이미지로, 빈 설명은 생략한다', () => {
    expect(toCreateInput({ ...READY, description: '  ', purchaseNotice: ' 흔들림 주의 ' })).toEqual(
      {
        name: '그림일기 케이크',
        initialImageUrl: 'https://cdn.test/1.jpg',
        description: undefined,
        purchaseNotice: '흔들림 주의',
        regularPrice: 35000,
        salePrice: 33000,
        isActive: false,
      },
    );
  });

  it('할인가가 없으면 보내지 않는다', () => {
    expect(toCreateInput({ ...READY, salePrice: '' }).salePrice).toBeUndefined();
  });

  it('카테고리 id "0"도 버리지 않는다', () => {
    expect(categoryIds({ ...READY, eventCategoryId: '0', styleCategoryId: null })).toEqual(['0']);
  });
});
