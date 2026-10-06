import {
  defaultRect,
  moveRect,
  newSlot,
  resizeRect,
  SCALE,
  type Slot,
  slotChanged,
  slotErrors,
  toPx,
  toSlots,
  toTokenInput,
} from './template-slots';

const SLOT: Slot = {
  key: 'k1',
  id: 'k1',
  tokenKey: 'name',
  defaultText: '생일 축하해',
  maxLength: '10',
  isRequired: true,
  rect: { x: 1000, y: 2000, width: 4000, height: 1000 },
};

describe('좌표 비율 변환', () => {
  it('비율을 화면 크기에 맞춰 픽셀로 바꾼다', () => {
    expect(toPx(SLOT.rect, 285)).toEqual({ left: 28.5, top: 57, width: 114, height: 28.5 });
    expect(toPx(SLOT.rect, 400)).toEqual({ left: 40, top: 80, width: 160, height: 40 });
  });

  it('픽셀 이동량을 비율로 바꿔 옮긴다', () => {
    expect(moveRect(SLOT.rect, 28.5, -28.5, 285)).toEqual({ ...SLOT.rect, x: 2000, y: 1000 });
  });

  it.each<[string, number, number, { x: number; y: number }]>([
    ['왼쪽 위 밖', -1000, -1000, { x: 0, y: 0 }],
    ['오른쪽 아래 밖', 1000, 1000, { x: SCALE - 4000, y: SCALE - 1000 }],
  ])('이미지 밖으로 나가지 않는다(%s)', (_, dx, dy, pos) => {
    expect(moveRect(SLOT.rect, dx, dy, 285)).toMatchObject(pos);
  });

  it('크기는 왼쪽 위를 고정하고 최소·남은 폭 안에서 바꾼다', () => {
    expect(resizeRect(SLOT.rect, 28.5, 28.5, 285)).toEqual({
      ...SLOT.rect,
      width: 5000,
      height: 2000,
    });
    expect(resizeRect(SLOT.rect, -1000, -1000, 285)).toMatchObject({ width: 800, height: 800 });
    expect(resizeRect(SLOT.rect, 1000, 1000, 285)).toMatchObject({ width: 9000, height: 8000 });
  });
});

describe('toSlots', () => {
  it('위치가 없는 슬롯은 기본 자리에, 있으면 그대로 둔다', () => {
    const token = {
      id: 't1',
      tokenKey: 'name',
      defaultText: '축하',
      maxLength: 10,
      isRequired: false,
      posX: 10,
      posY: 20,
      width: 3000,
      height: 900,
    };
    expect(toSlots([token, { ...token, id: 't2', posX: null }])).toEqual([
      expect.objectContaining({
        id: 't1',
        maxLength: '10',
        rect: { x: 10, y: 20, width: 3000, height: 900 },
      }),
      expect.objectContaining({ id: 't2', rect: defaultRect(1) }),
    ]);
  });

  it('기본 자리는 아래로 쌓이다 이미지 안에서 멈춘다', () => {
    expect(defaultRect(0).y).toBe(1000);
    expect(defaultRect(9).y).toBe(SCALE - 1500);
  });
});

describe('slotErrors', () => {
  it.each<[string, Partial<Slot>, Record<string, string>]>([
    ['정상', {}, {}],
    ['키 비움', { tokenKey: '' }, { tokenKey: '영문 소문자·숫자로 입력해 주세요' }],
    ['키 대문자', { tokenKey: 'Name' }, { tokenKey: '영문 소문자·숫자로 입력해 주세요' }],
    ['키 61자', { tokenKey: 'a'.repeat(61) }, { tokenKey: '60자까지 입력할 수 있어요' }],
    ['기본 문구 공백', { defaultText: ' ' }, { defaultText: '기본 문구를 입력해 주세요' }],
    ['최대 글자 0', { maxLength: '0' }, { maxLength: '1자 이상으로 입력해 주세요' }],
  ])('%s', (_, patch, expected) => {
    const errors = slotErrors([{ ...SLOT, ...patch }]);
    expect(errors.k1 ?? {}).toEqual(expected);
  });

  it('슬롯끼리 키가 겹치면 둘 다 오류다', () => {
    const errors = slotErrors([SLOT, { ...SLOT, key: 'k2', id: null }]);
    expect(Object.keys(errors)).toEqual(['k1', 'k2']);
  });
});

describe('slotChanged', () => {
  it('새 슬롯은 늘 바뀐 것이다', () => {
    expect(slotChanged(newSlot(0), undefined)).toBe(true);
  });

  it.each<[string, Partial<Slot>, boolean]>([
    ['그대로', {}, false],
    ['기본 문구 앞뒤 공백만', { defaultText: ' 생일 축하해 ' }, false],
    ['키', { tokenKey: 'nick' }, true],
    ['최대 글자', { maxLength: '12' }, true],
    ['필수', { isRequired: false }, true],
    ['위치', { rect: { ...SLOT.rect, x: 1001 } }, true],
  ])('%s → %s', (_, patch, expected) => {
    expect(slotChanged({ ...SLOT, ...patch }, SLOT)).toBe(expected);
  });
});

describe('toTokenInput', () => {
  it('비율 좌표·순서와 함께 보내고 새 슬롯은 tokenId를 비운다', () => {
    expect(toTokenInput({ ...SLOT, id: null, defaultText: ' 축하 ' }, 'ct1', 2)).toEqual({
      tokenId: undefined,
      templateId: 'ct1',
      tokenKey: 'name',
      defaultText: '축하',
      maxLength: 10,
      isRequired: true,
      sortOrder: 2,
      posX: 1000,
      posY: 2000,
      width: 4000,
      height: 1000,
    });
  });
});
