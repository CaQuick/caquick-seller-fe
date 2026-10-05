import {
  WEEKDAYS_KO,
  addDays,
  formatKst,
  formatPickupKst,
  formatRelativeKst,
  formatTimeKst,
  formatYmd,
  kstDayEndIso,
  kstDayStartIso,
  kstParts,
  kstToIso,
  parseYmd,
  todayKst,
} from './kst';

describe('kst', () => {
  it('todayKst는 UTC 자정 직전에도 KST 날짜를 준다', () => {
    expect(todayKst(new Date('2026-09-27T15:30:00.000Z'))).toEqual({ y: 2026, m: 9, d: 28 });
    expect(todayKst(new Date('2026-09-27T14:59:59.999Z'))).toEqual({ y: 2026, m: 9, d: 27 });
  });

  it('addDays는 월·연 경계를 넘는다', () => {
    expect(formatYmd(addDays({ y: 2026, m: 1, d: 1 }, -1))).toBe('2025-12-31');
    expect(formatYmd(addDays({ y: 2026, m: 2, d: 28 }, 1))).toBe('2026-03-01');
  });

  it.each([
    ['2026-09-27', true],
    ['2026-02-30', false],
    ['2026-9-7', false],
    ['abc', false],
  ])('parseYmd(%s) 유효=%s', (s, ok) => {
    expect(parseYmd(s) !== null).toBe(ok);
  });

  it('KST 하루 경계를 UTC ISO로 바꾼다(양끝 포함)', () => {
    const d = { y: 2026, m: 9, d: 27 };
    expect(kstDayStartIso(d)).toBe('2026-09-26T15:00:00.000Z');
    expect(kstDayEndIso(d)).toBe('2026-09-27T14:59:59.999Z');
  });

  it('kstParts ↔ kstToIso', () => {
    expect(kstParts('2026-09-30T15:00:00.000Z')).toEqual({
      y: 2026,
      m: 10,
      d: 1,
      hh: 0,
      mm: 0,
      weekday: 4,
    });
    expect(WEEKDAYS_KO[kstParts('2026-09-30T15:00:00.000Z').weekday]).toBe('목');
    expect(kstToIso({ y: 2026, m: 10, d: 1 })).toBe('2026-09-30T15:00:00.000Z');
    expect(kstToIso({ y: 2026, m: 10, d: 1, hh: 9, mm: 30 })).toBe('2026-10-01T00:30:00.000Z');
  });

  it('formatKst·formatTimeKst·formatPickupKst는 UTC ISO를 KST 표시로', () => {
    expect(formatKst('2026-09-27T08:05:00.000Z')).toBe('09-27 17:05');
    expect(formatKst('2026-12-31T15:00:00.000Z', true)).toBe('2027-01-01 00:00');
    expect(formatTimeKst('2026-09-27T08:05:00.000Z')).toBe('17:05');
    expect(formatPickupKst('2026-09-27T08:05:00.000Z')).toBe('9/27 17:05');
  });

  describe('formatRelativeKst', () => {
    const now = new Date('2026-10-06T03:30:00.000Z'); // KST 2026-10-06 12:30

    it.each([
      ['미래(시계 오차)', '2026-10-06T03:31:00.000Z', '방금'],
      ['59초 전', '2026-10-06T03:29:01.000Z', '방금'],
      ['1분 전', '2026-10-06T03:29:00.000Z', '1분 전'],
      ['59분 전', '2026-10-06T02:31:00.000Z', '59분 전'],
      ['60분 전·같은 날', '2026-10-06T02:30:00.000Z', '오늘 11:30'],
      ['오늘 KST 00:05', '2026-10-05T15:05:00.000Z', '오늘 00:05'],
      ['어제 KST 23:50', '2026-10-05T14:50:00.000Z', '어제 23:50'],
      ['이틀 전', '2026-10-04T01:00:00.000Z', '10-04'],
      ['올해 1월 1일 KST 00:00(UTC로는 작년)', '2025-12-31T15:00:00.000Z', '01-01'],
      ['작년', '2025-12-31T14:00:00.000Z', '2025-12-31'],
    ])('%s → %s', (_, iso, expected) => {
      expect(formatRelativeKst(iso, now)).toBe(expected);
    });

    it('반증: 1월 1일 KST 자정 직후 — 1시간 안은 분, 어제는 어제, 더 전은 해가 붙는다', () => {
      const jan1 = new Date('2026-12-31T15:10:00.000Z'); // KST 2027-01-01 00:10
      expect(formatRelativeKst('2026-12-31T14:30:00.000Z', jan1)).toBe('40분 전');
      expect(formatRelativeKst('2026-12-31T13:30:00.000Z', jan1)).toBe('어제 22:30');
      expect(formatRelativeKst('2026-12-20T00:00:00.000Z', jan1)).toBe('2026-12-20');
    });
  });
});
