import { enumValues } from '@/test/generated-enums';

import { formatPeriod, settlementStatusView } from './settlement';

describe('settlementStatusView', () => {
  const table: Record<string, { label: string; tone: string }> = {
    PENDING: { label: '송금 대기', tone: 'gray' },
    PAID: { label: '송금 완료', tone: 'done' },
  };

  it('표가 생성 enum 값 전부를 덮는다', () => {
    expect(Object.keys(table).sort()).toEqual([...enumValues('SettlementStatusType')].sort());
  });

  it.each([
    ...Object.entries(table),
    ['HELD', { label: '확인 필요', tone: 'gray' }],
    ['__proto__', { label: '확인 필요', tone: 'gray' }],
  ])('%s → %j', (status, view) => {
    expect(settlementStatusView(status)).toEqual(view);
  });
});

describe('formatPeriod', () => {
  const today = { y: 2026, m: 11, d: 19 };
  it.each([
    ['2026-11-09', '2026-11-15', '11월 9일 (월) ~ 11월 15일 (일)'],
    ['2026-12-28', '2027-01-03', '2026년 12월 28일 (월) ~ 2027년 1월 3일 (일)'],
    ['2025-11-10', '2025-11-16', '2025년 11월 10일 (월) ~ 2025년 11월 16일 (일)'],
    ['2026-02-30', '2026-03-01', '2026-02-30 ~ 3월 1일 (일)'],
  ])('%s ~ %s → %s', (start, end, expected) => {
    expect(formatPeriod(start, end, today)).toBe(expected);
  });
});
