import { customModeLabel, modeRowDescription, modeSummary } from './customization';

type Product = Parameters<typeof modeSummary>[0];

const group = (threeDCategory: 'SIZE' | 'SHAPE' | null, isActive = true) => ({
  id: 'g',
  name: '옵션',
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  isActive,
  threeDCategory,
  optionItems: [],
});
const PRODUCT: Product = {
  customMode: 'NONE',
  customReadiness: [],
  customTemplate: null,
  optionGroups: [],
};

describe('modeSummary', () => {
  it.each<[string, Partial<Product>, Product['customMode'], string | null]>([
    ['없음은 요약이 없다', {}, 'NONE', null],
    ['바탕이 없는 슬롯형', {}, 'SLOT', '바탕 이미지를 아직 올리지 않았어요'],
    [
      '슬롯형은 문구 자리 수와 자유 편집',
      { customTemplate: { id: 't', freeEditEnabled: false, textTokens: [{ id: 'k' }] } },
      'SLOT',
      '문구 자리 1개 · 자유 편집 끔',
    ],
    [
      '3D 그룹이 없는 3D',
      { optionGroups: [group(null)] },
      'THREE_D',
      '3D 항목에 연결한 옵션 그룹이 없어요',
    ],
    [
      '3D는 켜진 3D 그룹의 카테고리',
      { optionGroups: [group('SHAPE'), group('SIZE', false), group('SIZE')] },
      'THREE_D',
      '3D 항목 옵션: 모양·크기',
    ],
  ])('%s', (_, patch, mode, expected) => {
    expect(modeSummary({ ...PRODUCT, ...patch }, mode)).toBe(expected);
  });
});

describe('modeRowDescription', () => {
  it.each<[string, Partial<Product>, string]>([
    ['없음', {}, '구매자는 옵션만 고르고 주문해요'],
    ['지금 방식 요약', { customMode: 'SLOT' }, '바탕 이미지를 아직 올리지 않았어요'],
    [
      '다른 방식의 이슈는 보지 않는다',
      { customReadiness: [{ mode: 'THREE_D', issues: [{ code: 'X', message: 'm' }] }] },
      '구매자는 옵션만 고르고 주문해요',
    ],
    [
      '지금 방식의 이슈가 먼저',
      {
        customMode: 'SLOT',
        customReadiness: [{ mode: 'SLOT', issues: [{ code: 'X', message: 'm' }] }],
      },
      '지금 상태로는 구매자 주문이 거절돼요',
    ],
  ])('%s', (_, patch, expected) => {
    expect(modeRowDescription({ ...PRODUCT, ...patch })).toBe(expected);
  });
});

it('방식 라벨은 모르는 값이면 확인 필요다', () => {
  expect(['NONE', 'SLOT', 'THREE_D', 'STICKER'].map(customModeLabel)).toEqual([
    '없음',
    '슬롯형',
    '3D',
    '확인 필요',
  ]);
});
