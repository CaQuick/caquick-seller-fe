import { describeAudit, diffJson, diffText, formatAuditAt, formatValue, parseJson } from './audit';

describe('diffJson', () => {
  it('바뀐 키만 이전 → 이후로', () => {
    expect(
      diffJson({ name: '눈사람', salePrice: 35000 }, { name: '눈사람', salePrice: 33000 }),
    ).toEqual([{ label: '할인가', before: '35,000원', after: '33,000원' }]);
  });

  it('중첩 객체는 경로로 펼쳐 비교한다', () => {
    expect(diffJson({ policy: { lead: 60, max: 7 } }, { policy: { lead: 90, max: 7 } })).toEqual([
      { label: 'policy.lead', before: '60', after: '90' },
    ]);
  });

  it('추가된 키는 없음 → 값, 삭제된 키는 값 → 없음', () => {
    expect(diffJson({ reason: '연휴' }, { note: '메모' })).toEqual([
      { label: '사유', before: '연휴', after: '없음' },
      { label: '메모', before: '없음', after: '메모' },
    ]);
  });

  it('null 쪽(생성·삭제 기록)은 빈 객체로 본다', () => {
    expect(diffJson(null, { name: '호박' })).toEqual([
      { label: '이름', before: '없음', after: '호박' },
    ]);
    expect(diffJson({ name: '호박' }, null)).toEqual([
      { label: '이름', before: '호박', after: '없음' },
    ]);
  });

  it('값 null과 키 없음은 같다고 본다', () => {
    expect(diffJson({ note: null }, {})).toEqual([]);
  });

  it('반증: 식별자 키(id·xxxId·xxxIds)는 diff에서 뺀다', () => {
    expect(
      diffJson({ topicId: '1' }, { topicId: '2', imageIds: ['3'], id: '4', paid: true }),
    ).toEqual([{ label: 'paid', before: '없음', after: '켬' }]);
  });

  it('배열은 통째로 비교한다', () => {
    expect(diffJson({ tags: ['a'] }, { tags: ['a', 'b'] })).toEqual([
      { label: 'tags', before: 'a', after: 'a, b' },
    ]);
  });
});

describe('formatValue', () => {
  it.each([
    ['note', null, '없음'],
    ['note', '', '없음'],
    ['isActive', true, '켬'],
    ['isClosed', false, '끔'],
    ['regularPrice', 33000, '33,000원'],
    ['minLeadTimeMinutes', 1440, '1,440분'],
    ['unknown', 5, '5'],
    ['dayOfWeek', 6, '토'],
    ['status', 'CONFIRMED', '확정'],
    ['status', 'WEIRD', 'WEIRD'],
    ['capacityDate', '2026-10-09', '2026-10-09'],
    ['closureDate', '2026-10-09T00:00:00.000Z', '2026-10-09'],
    ['changedAt', '2026-10-06T00:12:00.000Z', '2026-10-06 09:12'],
    ['tags', [], '없음'],
    ['meta', { a: 1 }, '{"a":1}'],
    ['note', '가'.repeat(61), `${'가'.repeat(60)}…`],
  ])('%s=%j → %s', (key, value, expected) => {
    expect(formatValue(key, value)).toBe(expected);
  });
});

describe('diffText', () => {
  const lines = Array.from({ length: 22 }, (_, i) => ({
    label: `k${i}`,
    before: '1',
    after: '2',
  }));

  it('키: 이전 → 이후 줄로 잇는다', () => {
    expect(diffText(lines.slice(0, 2))).toBe('k0: 1 → 2\nk1: 1 → 2');
  });

  it('20줄을 넘으면 나머지는 개수만', () => {
    const text = diffText(lines).split('\n');
    expect(text).toHaveLength(21);
    expect(text.at(-1)).toBe('외 2줄');
  });

  it('반증: 정확히 20줄이면 요약 줄이 없다', () => {
    expect(diffText(lines.slice(0, 20)).split('\n')).toHaveLength(20);
  });
});

describe('describeAudit', () => {
  it.each([
    [
      '상품 이름 변경',
      {
        targetType: 'PRODUCT',
        targetId: '7',
        beforeJson: '{"name":"가"}',
        afterJson: '{"name":"나"}',
      },
      '나',
      1,
    ],
    [
      '상품 이미지(이름 없음)',
      { targetType: 'PRODUCT', targetId: '7', afterJson: '{"imageId":"3"}' },
      '상품 #7 · 이미지',
      0,
    ],
    [
      '영업시간',
      { targetType: 'STORE', targetId: '3', afterJson: '{"dayOfWeek":6,"isClosed":false}' },
      '매장 · 영업시간',
      2,
    ],
    [
      '자동응답',
      { targetType: 'STORE', targetId: '3', afterJson: '{"topicId":"9"}' },
      '매장 · 자동응답',
      0,
    ],
    [
      '주문 상태',
      {
        targetType: 'ORDER',
        targetId: '45',
        beforeJson: '{"status":"SUBMITTED"}',
        afterJson: '{"status":"CONFIRMED","note":null}',
      },
      '주문 #45',
      1,
    ],
    [
      '대화',
      { targetType: 'CONVERSATION', targetId: '2', afterJson: '{"messageId":"1"}' },
      '대화 #2',
      0,
    ],
    [
      '반증: 비밀번호는 값이 있어도 펼치지 않는다',
      {
        targetType: 'CHANGE_PASSWORD',
        targetId: '1',
        afterJson: '{"changedAt":"2026-10-06T00:00:00Z"}',
      },
      '비밀번호',
      0,
    ],
    ['깨진 JSON', { targetType: 'STORE', targetId: '3', afterJson: '{' }, '매장', 0],
    ['목록 밖 대상', { targetType: 'BANNER', targetId: '1' }, 'BANNER #1', 0],
  ] as const)('%s', (_, log, title, diffCount) => {
    const result = describeAudit(log);
    expect(result.title).toBe(title);
    expect(result.diff).toHaveLength(diffCount);
  });

  it.each([
    [null, null],
    ['[1,2]', null],
    ['"문자"', null],
    ['{"a":1}', { a: 1 }],
  ])('parseJson(%j) → %j', (raw, expected) => {
    expect(parseJson(raw)).toEqual(expected);
  });
});

describe('formatAuditAt', () => {
  const now = new Date('2026-10-06T03:00:00.000Z'); // KST 10월 6일 12:00
  it.each([
    ['2026-10-06T00:12:00.000Z', '오늘 09:12'],
    ['2026-10-05T09:02:00.000Z', '어제 18:02'],
    ['2026-10-03T02:20:00.000Z', '10월 3일 11:20'],
    ['2025-12-31T02:20:00.000Z', '2025년 12월 31일 11:20'],
  ])('%s → %s', (iso, expected) => {
    expect(formatAuditAt(iso, now)).toBe(expected);
  });
});
