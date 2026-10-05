import { formatCount, formatKrw, formatNumber } from './format';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1,000'],
    [12345, '12,345'],
    [1234567, '1,234,567'],
    [-1234567, '-1,234,567'],
    [1234.5, '1,234.5'],
    [-0.5, '-0.5'],
    [100000, '100,000'],
  ])('%p → %s', (n, expected) => {
    expect(formatNumber(n)).toBe(expected);
  });

  it('반증: NaN·Infinity는 0', () => {
    expect(formatNumber(Number.NaN)).toBe('0');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });

  it('원·단위 접미', () => {
    expect(formatKrw(38000)).toBe('38,000원');
    expect(formatCount(3, '개')).toBe('3개');
    expect(formatCount(1200)).toBe('1,200');
  });
});
