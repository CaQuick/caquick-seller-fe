import { formatTimeKst, kstDayStartIso, kstToIso } from '@/shared/lib/kst';

import {
  dateIsoToYmd,
  formatMonthDay,
  hmToTimeIso,
  monthDateRange,
  monthKey,
  timeIsoToHm,
  ymdToDateIso,
} from './time';

describe('영업시간 HH:mm ↔ DateTime', () => {
  it.each([
    ['00:00', '1970-01-01T00:00:00.000Z'],
    ['10:00', '1970-01-01T10:00:00.000Z'],
    ['09:30', '1970-01-01T09:30:00.000Z'],
    ['23:50', '1970-01-01T23:50:00.000Z'],
  ])('%s → %s → 다시 %s', (hm, iso) => {
    expect(hmToTimeIso(hm)).toBe(iso);
    expect(timeIsoToHm(iso)).toBe(hm);
  });

  it('KST로 9시간을 빼지 않는다 — BE Time 컬럼은 UTC 시·분을 벽시계로 저장한다', () => {
    // 반증: KST→UTC 변환을 쓰면 10:00이 01:00으로 저장된다
    expect(hmToTimeIso('10:00')).not.toBe(kstToIso({ y: 1970, m: 1, d: 1, hh: 10, mm: 0 }));
    // 반증: KST 표시 함수로 읽으면 10:30이 19:30이 된다
    expect(formatTimeKst('1970-01-01T10:30:00.000Z')).toBe('19:30');
    expect(timeIsoToHm('1970-01-01T10:30:00.000Z')).toBe('10:30');
  });
});

describe('날짜 전용 값', () => {
  it('UTC 자정 ISO로 보내고 받는다', () => {
    expect(ymdToDateIso('2026-10-09')).toBe('2026-10-09T00:00:00.000Z');
    expect(dateIsoToYmd('2026-10-09T00:00:00.000Z')).toBe('2026-10-09');
  });

  it('KST 하루 시작(전날 15:00Z)으로 보내지 않는다 — 날짜 컬럼에 하루 전으로 들어간다', () => {
    expect(kstDayStartIso({ y: 2026, m: 10, d: 9 })).toBe('2026-10-08T15:00:00.000Z');
    expect(ymdToDateIso('2026-10-09')).not.toBe(kstDayStartIso({ y: 2026, m: 10, d: 9 }));
  });

  it.each([
    [{ y: 2026, m: 10 }, '2026-10', '2026-10-01', '2026-10-31'],
    [{ y: 2028, m: 2 }, '2028-02', '2028-02-01', '2028-02-29'],
    [{ y: 2026, m: 12 }, '2026-12', '2026-12-01', '2026-12-31'],
  ])('%p 범위는 %s의 1일~말일', (month, key, from, to) => {
    expect(monthKey(month)).toBe(key);
    expect(monthDateRange(month)).toEqual({
      fromDate: `${from}T00:00:00.000Z`,
      toDate: `${to}T00:00:00.000Z`,
    });
  });

  it.each([
    ['2026-10-09', false, '10월 9일 (금)'],
    ['2026-10-08', true, '10월 8일 목요일'],
    ['2026-02-30', false, '2026-02-30'],
  ])('%s(long %p) → %s', (ymd, long, expected) => {
    expect(formatMonthDay(ymd, long)).toBe(expected);
  });
});
