import {
  cleanText,
  codePoints,
  defaultRect,
  moveRect,
  newSlot,
  nextTokenKey,
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
  label: '받는 사람',
  defaultText: '생일 축하해',
  maxLength: '10',
  isRequired: true,
  textColor: '#1D1D1D',
  textAlign: 'CENTER',
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
  it('서버 슬롯의 좌표를 그대로 박스로 쓴다', () => {
    const token = {
      id: 't1',
      tokenKey: 'name',
      label: '이름',
      defaultText: '축하',
      maxLength: 10,
      isRequired: false,
      posX: 10,
      posY: 20,
      width: 3000,
      height: 900,
      textColor: '#FF0000',
      textAlign: 'LEFT' as const,
    };
    expect(toSlots([token])).toEqual([
      expect.objectContaining({
        id: 't1',
        label: '이름',
        maxLength: '10',
        textColor: '#FF0000',
        textAlign: 'LEFT',
        rect: { x: 10, y: 20, width: 3000, height: 900 },
      }),
    ]);
  });

  it('기본 자리는 아래로 쌓이다 이미지 안에서 멈춘다', () => {
    expect(defaultRect(0).y).toBe(1000);
    expect(defaultRect(9).y).toBe(SCALE - 1500);
  });
});

describe('nextTokenKey', () => {
  it.each<[string[], string]>([
    [[], 'slot1'],
    [['slot1', 'slot2'], 'slot3'],
    [['slot2', 'name'], 'slot1'],
    [['slot1', 'slot3'], 'slot2'],
  ])('%j가 있으면 %s', (used, expected) => {
    expect(nextTokenKey(used)).toBe(expected);
  });

  it('새 자리는 키를 만들고 표시 이름은 비워 두며 서버 기본 스타일로 시작한다', () => {
    expect(newSlot(1, ['slot1', 'name'])).toMatchObject({
      id: null,
      tokenKey: 'slot2',
      label: '',
      maxLength: '20',
      isRequired: true,
      textColor: '#000000',
      textAlign: 'CENTER',
      rect: defaultRect(1),
    });
  });
});

describe('글자 수', () => {
  it.each<[string, number]>([
    ['생일 축하해', 6],
    ['🎂🎉', 2],
    ['👨‍👩‍👧', 5],
    ['위\r\n아래', 4],
  ])('%j는 줄바꿈을 LF로 바꾼 뒤 코드 포인트 %d자', (text, n) => {
    expect(codePoints(cleanText(text))).toBe(n);
  });
});

describe('slotErrors', () => {
  it.each<[string, Partial<Slot>, Record<string, string>]>([
    ['정상', {}, {}],
    ['표시 이름 공백', { label: ' ' }, { label: '표시 이름을 입력해 주세요' }],
    ['표시 이름 30자', { label: '가'.repeat(30) }, {}],
    ['표시 이름 31자', { label: '가'.repeat(31) }, { label: '30자까지 입력할 수 있어요' }],
    ['표시 이름 이모지 30개', { label: '🎂'.repeat(30) }, {}],
    ['기본 문구 공백', { defaultText: ' ' }, { defaultText: '기본 문구를 입력해 주세요' }],
    ['기본 문구 = 최대', { defaultText: '가'.repeat(10) }, {}],
    [
      '기본 문구 > 최대',
      { defaultText: '가'.repeat(11) },
      { defaultText: '최대 글자 수(10자)보다 길어요' },
    ],
    ['이모지는 한 글자', { defaultText: '🎂'.repeat(10) }, {}],
    ['최대 글자 0', { maxLength: '0' }, { maxLength: '1~50자로 입력해 주세요' }],
    ['최대 글자 50', { maxLength: '50', defaultText: '가'.repeat(50) }, {}],
    ['최대 글자 51', { maxLength: '51' }, { maxLength: '1~50자로 입력해 주세요' }],
    ['최대 글자 비움', { maxLength: '' }, { maxLength: '1~50자로 입력해 주세요' }],
    ['소문자 색', { textColor: '#ff00aa' }, {}],
    ['색 6자리 아님', { textColor: '#FFF' }, { textColor: '#RRGGBB 형식으로 입력해 주세요' }],
    ['색 # 없음', { textColor: 'FF00AA' }, { textColor: '#RRGGBB 형식으로 입력해 주세요' }],
  ])('%s', (_, patch, expected) => {
    const errors = slotErrors([{ ...SLOT, ...patch }]);
    expect(errors.k1 ?? {}).toEqual(expected);
  });
});

describe('slotChanged', () => {
  it('새 슬롯은 늘 바뀐 것이다', () => {
    expect(slotChanged(newSlot(0, []), undefined)).toBe(true);
  });

  it.each<[string, Partial<Slot>, boolean]>([
    ['그대로', {}, false],
    ['기본 문구 앞뒤 공백만', { defaultText: ' 생일 축하해 ' }, false],
    ['표시 이름 앞뒤 공백만', { label: ' 받는 사람 ' }, false],
    ['색 대소문자만', { textColor: '#1d1d1d' }, false],
    ['표시 이름', { label: '이름' }, true],
    ['색', { textColor: '#FF0000' }, true],
    ['정렬', { textAlign: 'LEFT' }, true],
    ['최대 글자', { maxLength: '12' }, true],
    ['필수', { isRequired: false }, true],
    ['위치', { rect: { ...SLOT.rect, x: 1001 } }, true],
  ])('%s → %s', (_, patch, expected) => {
    expect(slotChanged({ ...SLOT, ...patch }, SLOT)).toBe(expected);
  });
});

describe('toTokenInput', () => {
  it('비율 좌표·순서와 함께 보내고 새 슬롯은 tokenId를 비운다', () => {
    expect(
      toTokenInput(
        { ...SLOT, id: null, label: ' 이름 ', defaultText: ' 축하\r\n해 ', textColor: '#ff00aa' },
        'ct1',
        2,
      ),
    ).toEqual({
      tokenId: undefined,
      templateId: 'ct1',
      tokenKey: 'name',
      label: '이름',
      defaultText: '축하\n해',
      maxLength: 10,
      isRequired: true,
      sortOrder: 2,
      posX: 1000,
      posY: 2000,
      width: 4000,
      height: 1000,
      textColor: '#FF00AA',
      textAlign: 'CENTER',
    });
  });
});
