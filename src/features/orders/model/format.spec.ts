import { formatDateTime, formatPickup, formatSigned } from './format';

const TODAY = { y: 2026, m: 10, d: 6 };

describe('주문 표기', () => {
  it.each([
    ['2026-10-06T08:00:00.000Z', '오늘 17:00'],
    ['2026-10-06T15:00:00.000Z', '10월 7일 00:00'],
    ['2026-10-05T14:59:00.000Z', '10월 5일 23:59'],
  ])('픽업 %s → %s', (iso, label) => {
    expect(formatPickup(iso, TODAY)).toBe(label);
  });

  it('요일을 붙인 일시', () => {
    expect(formatDateTime('2026-10-08T06:30:00.000Z', true)).toBe('10월 8일 (목) 15:30');
    expect(formatDateTime('2026-10-05T11:14:00.000Z')).toBe('10월 5일 20:14');
  });

  it.each([
    [5000, '+5,000원'],
    [0, '+0원'],
    [-1000, '-1,000원'],
  ])('%d → %s', (n, label) => {
    expect(formatSigned(n)).toBe(label);
  });
});
