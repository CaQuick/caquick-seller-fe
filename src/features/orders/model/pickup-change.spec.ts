import {
  changeCalendar,
  initialPick,
  monthKeyOf,
  pickupChangeItems,
  slotChips,
  toPickupAt,
} from './pickup-change';

describe('changeCalendar', () => {
  it('고를 수 있는 날만 모으고, 휴무·마감은 표시, 지난 날·범위 밖은 흐리게 둔다', () => {
    const { marks, blocked, selectable } = changeCalendar([
      { date: '2026-11-18', selectable: false, reason: 'PAST' },
      { date: '2026-11-19', selectable: true, reason: null },
      { date: '2026-11-20', selectable: false, reason: 'CLOSED' },
      { date: '2026-11-21', selectable: false, reason: 'CAPACITY_FULL' },
      { date: '2026-12-31', selectable: false, reason: 'OUT_OF_RANGE' },
      { date: '2026-12-30', selectable: false, reason: 'NEW_REASON' },
    ]);
    expect([...selectable]).toEqual(['2026-11-19']);
    expect(marks).toEqual({
      '2026-11-20': { state: 'off', caption: '휴무' },
      '2026-11-21': { state: 'full', caption: '마감' },
    });
    expect([...blocked]).toEqual(['2026-11-18', '2026-12-31', '2026-12-30']);
  });
});

describe('slotChips', () => {
  // 지금 픽업: KST 11월 20일 15:00
  const current = '2026-11-20T06:00:00.000Z';
  const slots = [
    { time: '11:00', available: false },
    { time: '14:30', available: true },
    { time: '15:00', available: true },
  ];

  it('예약 불가 슬롯과 지금 픽업 시각은 막고, 지금 시각에는 현재를 붙인다', () => {
    expect(slotChips(slots, '2026-11-20', current)).toEqual([
      { time: '11:00', label: '11:00', disabled: true },
      { time: '14:30', label: '14:30', disabled: false },
      { time: '15:00', label: '15:00 현재', disabled: true },
    ]);
  });

  it('반증: 다른 날의 같은 시각은 고를 수 있다', () => {
    expect(slotChips(slots, '2026-11-21', current)[2]).toEqual({
      time: '15:00',
      label: '15:00',
      disabled: false,
    });
  });

  it('반증: UTC 날짜가 아니라 KST 날짜로 지금 픽업을 찾는다', () => {
    // UTC 11월 20일 16:00 = KST 11월 21일 01:00
    const lateNight = '2026-11-20T16:00:00.000Z';
    const night = [{ time: '01:00', available: true }];
    expect(slotChips(night, '2026-11-21', lateNight)[0]?.disabled).toBe(true);
    expect(slotChips(night, '2026-11-20', lateNight)[0]?.disabled).toBe(false);
  });
});

describe('toPickupAt', () => {
  it.each([
    ['2026-11-21', '11:30', '2026-11-21T02:30:00.000Z'],
    ['2026-11-21', '00:00', '2026-11-20T15:00:00.000Z'],
    ['2026-11-21', '23:59', '2026-11-21T14:59:00.000Z'],
    ['2026-02-30', '11:00', null],
    ['2026-11-21', '24:00', null],
    ['2026-11-21', '9:00', null],
    ['2026-11-21', '11:60', null],
  ])('%s %s → %s', (date, time, expected) => {
    expect(toPickupAt(date, time)).toBe(expected);
  });
});

describe('initialPick', () => {
  const now = new Date('2026-11-19T03:00:00.000Z'); // KST 11월 19일 12:00
  it.each([
    ['픽업이 앞이면 그 달·그날', '2026-12-01T01:00:00.000Z', { y: 2026, m: 12 }, '2026-12-01'],
    ['픽업이 지났으면 이번 달·선택 없음', '2026-10-31T01:00:00.000Z', { y: 2026, m: 11 }, null],
    ['반증: 지금과 같은 시각은 지난 것으로 본다', now.toISOString(), { y: 2026, m: 11 }, null],
  ])('%s', (_, pickupAt, month, date) => {
    expect(initialPick(pickupAt, now)).toEqual({ month, date });
  });
});

describe('monthKeyOf', () => {
  it.each([
    [{ y: 2026, m: 1 }, '2026-01'],
    [{ y: 2026, m: 12 }, '2026-12'],
  ])('%j → %s', (month, key) => {
    expect(monthKeyOf(month)).toBe(key);
  });
});

describe('pickupChangeItems', () => {
  it('이전 → 이후 일시와 변경 시각, 메모를 오래된 순 그대로 둔다', () => {
    expect(
      pickupChangeItems([
        {
          id: 'p1',
          fromPickupAt: '2026-11-20T06:00:00.000Z',
          toPickupAt: '2026-11-21T02:30:00.000Z',
          changedAt: '2026-11-19T00:12:00.000Z',
          note: '재료 입고가 늦어요',
        },
        {
          id: 'p2',
          fromPickupAt: '2026-11-21T02:30:00.000Z',
          toPickupAt: '2026-11-22T05:00:00.000Z',
          changedAt: '2026-11-19T01:00:00.000Z',
          note: null,
        },
      ]),
    ).toEqual([
      {
        key: 'p1',
        title: '11월 20일 15:00 → 11월 21일 11:30',
        state: 'done',
        at: '11월 19일 09:12 변경',
        memo: '재료 입고가 늦어요',
      },
      {
        key: 'p2',
        title: '11월 21일 11:30 → 11월 22일 14:00',
        state: 'done',
        at: '11월 19일 10:00 변경',
        memo: undefined,
      },
    ]);
  });
});
