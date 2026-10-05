import {
  capacityCalendarDays,
  previewCalendar,
  SLOT_INTERVALS,
  stepSlotInterval,
} from './calendar';

const day = (date: string, reason: string | null) => ({
  date,
  selectable: reason === null,
  reason,
});

describe('capacityCalendarDays', () => {
  it.each([
    [null, { caption: '6' }],
    ['PAST', { caption: '6' }],
    ['OUT_OF_RANGE', { caption: '6' }],
    ['CLOSED', { state: 'off', caption: '휴무' }],
    ['CAPACITY_FULL', { state: 'full', caption: '마감' }],
  ])('구매자 달력 사유 %p → %p', (reason, expected) => {
    const days = capacityCalendarDays(
      [{ capacityDate: '2026-10-08T00:00:00.000Z', capacity: 6 }],
      [day('2026-10-08', reason)],
    );
    expect(days['2026-10-08']).toEqual(expected);
  });

  it('설정하지 않은 날은 칸 정보가 없다', () => {
    expect(capacityCalendarDays([], [day('2026-10-12', null)])).toEqual({});
  });

  it('구매자 달력이 없어도(비공개 매장) 수량만 그린다', () => {
    expect(
      capacityCalendarDays([{ capacityDate: '2026-10-24T00:00:00.000Z', capacity: 20 }]),
    ).toEqual({ '2026-10-24': { caption: '20' } });
  });
});

describe('previewCalendar', () => {
  it('휴무·마감은 칸 상태로, 지난 날·범위 밖은 막힌 날로 나눈다', () => {
    const { days, blocked } = previewCalendar([
      day('2026-10-05', 'PAST'),
      day('2026-10-08', null),
      day('2026-10-09', 'CLOSED'),
      day('2026-10-10', 'CAPACITY_FULL'),
      day('2026-10-21', 'OUT_OF_RANGE'),
    ]);
    expect(days).toEqual({
      '2026-10-09': { state: 'off', caption: '휴무' },
      '2026-10-10': { state: 'full', caption: '마감' },
    });
    expect([...blocked]).toEqual(['2026-10-05', '2026-10-21']);
  });
});

describe('stepSlotInterval', () => {
  it.each([
    [10, 1, 15],
    [15, 1, 30],
    [30, 1, 60],
    [60, 1, 60],
    [60, -1, 30],
    [30, -1, 15],
    [15, -1, 10],
    [10, -1, 10],
    // 관리자가 목록 밖 값으로 정한 경우 가까운 값으로 붙는다
    [5, 1, 10],
    [20, 1, 30],
    [20, -1, 15],
    [120, -1, 60],
  ] as const)('%d에서 %d → %d', (current, direction, expected) => {
    expect(stepSlotInterval(current, direction)).toBe(expected);
  });

  it('목록은 오름차순이다', () => {
    expect([...SLOT_INTERVALS].sort((a, b) => a - b)).toEqual([...SLOT_INTERVALS]);
  });
});
