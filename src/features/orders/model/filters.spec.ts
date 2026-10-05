import {
  DEFAULT_FILTERS,
  daysInRange,
  formatRange,
  hasFilters,
  NO_FILTERS,
  pickRangeDay,
  toListVars,
  weekRange,
} from './filters';

// 2026-10-06(화) 00:30 KST = 2026-10-05 15:30 UTC — UTC 날짜로 계산하면 하루 어긋난다
const KST_TUE_0030 = new Date('2026-10-05T15:30:00.000Z');

describe('toListVars', () => {
  it('오늘은 KST 하루 경계를 UTC ISO로 보낸다', () => {
    expect(toListVars({ ...NO_FILTERS, pickup: 'today' }, KST_TUE_0030)).toEqual({
      fromPickupAt: '2026-10-05T15:00:00.000Z',
      toPickupAt: '2026-10-06T14:59:59.999Z',
    });
  });

  it('기본값은 이번 주(월~일) 픽업이고 상태·검색·주문일은 보내지 않는다', () => {
    expect(toListVars(DEFAULT_FILTERS, KST_TUE_0030)).toEqual({
      fromPickupAt: '2026-10-04T15:00:00.000Z',
      toPickupAt: '2026-10-11T14:59:59.999Z',
    });
  });

  it('상태·검색(앞뒤 공백 제거)·직접 고른 픽업·주문일 기간을 함께 보낸다', () => {
    expect(
      toListVars(
        {
          status: 'CANCELED',
          pickup: { from: '2026-10-08', to: '2026-10-10' },
          created: { from: '2026-10-01', to: '2026-10-01' },
          search: '  010-1234 ',
        },
        KST_TUE_0030,
      ),
    ).toEqual({
      status: 'CANCELED',
      search: '010-1234',
      fromPickupAt: '2026-10-07T15:00:00.000Z',
      toPickupAt: '2026-10-10T14:59:59.999Z',
      fromCreatedAt: '2026-09-30T15:00:00.000Z',
      toCreatedAt: '2026-10-01T14:59:59.999Z',
    });
  });

  it('필터가 없으면 빈 input이다(공백 검색어 포함)', () => {
    expect(toListVars({ ...NO_FILTERS, search: '   ' }, KST_TUE_0030)).toEqual({});
  });

  it('형식이 깨진 기간은 보내지 않는다', () => {
    expect(
      toListVars({ ...NO_FILTERS, created: { from: '2026-02-30', to: '2026-03-01' } }),
    ).toEqual({});
  });
});

describe('weekRange', () => {
  it.each([
    [{ y: 2026, m: 10, d: 5 }, '월'],
    [{ y: 2026, m: 10, d: 6 }, '화'],
    [{ y: 2026, m: 10, d: 10 }, '토'],
    [{ y: 2026, m: 10, d: 11 }, '일'],
  ])('%o(%s)는 10/5~10/11', (today) => {
    expect(weekRange(today)).toEqual({ from: '2026-10-05', to: '2026-10-11' });
  });

  it('월말·연말을 넘긴다', () => {
    expect(weekRange({ y: 2026, m: 12, d: 31 })).toEqual({ from: '2026-12-28', to: '2027-01-03' });
  });
});

describe('hasFilters', () => {
  it.each([
    [NO_FILTERS, false],
    [{ ...NO_FILTERS, search: '  ' }, false],
    [DEFAULT_FILTERS, true],
    [{ ...NO_FILTERS, status: 'MADE' as const }, true],
    [{ ...NO_FILTERS, created: { from: '2026-10-01', to: '2026-10-02' } }, true],
    [{ ...NO_FILTERS, search: '김' }, true],
  ])('%o → %s', (filters, expected) => {
    expect(hasFilters(filters)).toBe(expected);
  });
});

describe('기간 고르기', () => {
  it.each([
    [{ from: null, to: null }, '2026-10-08', { from: '2026-10-08', to: null }],
    [{ from: '2026-10-08', to: null }, '2026-10-10', { from: '2026-10-08', to: '2026-10-10' }],
    [{ from: '2026-10-08', to: null }, '2026-10-08', { from: '2026-10-08', to: '2026-10-08' }],
    [{ from: '2026-10-08', to: null }, '2026-10-03', { from: '2026-10-03', to: null }],
    [{ from: '2026-10-08', to: '2026-10-10' }, '2026-10-20', { from: '2026-10-20', to: null }],
  ])('%o에서 %s를 누르면 %o', (draft, ymd, expected) => {
    expect(pickRangeDay(draft, ymd)).toEqual(expected);
  });

  it('기간 안 날짜를 전부 펼친다', () => {
    expect(daysInRange('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(daysInRange('2026-10-08', null)).toEqual(['2026-10-08']);
    expect(daysInRange('bad', null)).toEqual([]);
  });

  it.each([
    [{ from: '2026-10-08', to: '2026-10-12' }, '10/8~10/12'],
    [{ from: '2026-10-08', to: '2026-10-08' }, '10/8'],
  ])('%o 칩 문구는 %s', (range, label) => {
    expect(formatRange(range)).toBe(label);
  });
});
