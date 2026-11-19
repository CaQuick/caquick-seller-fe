import { type SellerOrderDetailQuery } from '@/graphql/generated/graphql';

import {
  areaStyle,
  customGallery,
  customImageLabel,
  customPreview,
  designView,
  slotTextValue,
} from './custom-view';

type Item = SellerOrderDetailQuery['sellerOrder']['items'][number];
type Design = NonNullable<Item['threeDDesign']>;

const images: Item['customImages'] = [
  { id: '1', kind: 'THREE_D_TOP', imageUrl: 'https://img/top.png' },
  { id: '2', kind: 'THREE_D_FRONT', imageUrl: 'https://img/front.png' },
  { id: '3', kind: 'NEW_KIND' as never, imageUrl: 'https://img/new.png' },
];

const DESIGN: Design = {
  schemaVersion: 1,
  basic: { shape: 'circle', size: 'mini', design: null, flavor: null, sheetColor: 'white' },
  top: [],
  side: [],
};
const CATALOG = {
  optionChoices: [{ category: 'SIZE', value: 'mini', renderScale: 0.82 }],
  sheetColors: [{ key: 'white', hex: '#FFFFFF' }],
  decos: [],
};

describe('커스텀 표시', () => {
  it('이미지 이름은 종류별이고 모르는 종류는 이미지로 그린다', () => {
    expect(customImageLabel('THREE_D_LEFT')).toBe('왼쪽');
    expect(customImageLabel('SLOT_COMPOSITE')).toBe('합성 이미지');
    expect(customGallery({ customImages: images })).toEqual({
      uris: ['https://img/top.png', 'https://img/front.png', 'https://img/new.png'],
      labels: ['윗면', '앞', '이미지'],
    });
  });

  it('대표 이미지는 서버 값, 없으면 첫 커스텀 이미지, 그것도 없으면 null', () => {
    expect(
      customPreview({ customPreviewImageUrl: 'https://img/p.png', customImages: images }),
    ).toBe('https://img/p.png');
    expect(customPreview({ customPreviewImageUrl: null, customImages: images })).toBe(
      'https://img/top.png',
    );
    expect(customPreview({ customPreviewImageUrl: null, customImages: [] })).toBeNull();
  });

  it.each([
    ['비운 선택 자리(null)', null, '문구 없음'],
    ['빈 문자열', '', '축하해'],
    ['입력한 문구', '사랑해', '사랑해'],
  ])('문구 값: %s → %s', (_, valueText, shown) => {
    expect(
      slotTextValue({ id: '1', label: '문구', defaultText: '축하해', valueText, sortOrder: 1 }),
    ).toBe(shown);
  });

  it('자유 편집 영역(한 변 10000)을 바탕 위 백분율로 바꾼다', () => {
    expect(areaStyle({ posX: 0, posY: 2500, width: 10000, height: 1234 })).toEqual({
      left: '0%',
      top: '25%',
      width: '100%',
      height: '12.34%',
    });
  });
});

describe('designView', () => {
  const ready = { data: CATALOG, isError: false };

  it.each([
    ['디자인이 없으면', null, ready, false, { kind: 'capture', reason: 'noDesign' }],
    ['카탈로그를 받는 중이면', DESIGN, { isError: false }, false, { kind: 'loading' }],
    [
      '카탈로그를 못 받으면',
      DESIGN,
      { isError: true },
      false,
      { kind: 'capture', reason: 'catalogError' },
    ],
    [
      '카탈로그에 없는 시트 색이면',
      { ...DESIGN, basic: { ...DESIGN.basic, sheetColor: 'gold' } },
      ready,
      false,
      { kind: 'capture', reason: 'catalogMiss' },
    ],
    [
      '앱이 모르는 모양이면',
      { ...DESIGN, basic: { ...DESIGN.basic, shape: 'moon' } },
      ready,
      false,
      { kind: 'capture', reason: 'unsupported' },
    ],
    ['GL이 실패했으면', DESIGN, ready, true, { kind: 'capture', reason: 'glError' }],
  ])('%s %j', (_, design, catalog, glFailed, expected) => {
    expect(designView(design, catalog, glFailed)).toEqual(expected);
  });

  it('그릴 수 있으면 카탈로그로 푼 값을 준다(다시 받는 중 실패해도 받은 카탈로그로)', () => {
    expect(designView(DESIGN, { data: CATALOG, isError: true }, false)).toEqual({
      kind: 'render',
      render: { shape: 'circle', design: null, color: '#FFFFFF', scale: 0.82, decals: [] },
    });
  });
});
