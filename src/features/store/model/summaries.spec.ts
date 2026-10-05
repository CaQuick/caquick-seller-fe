import {
  closuresSummary,
  describeLeadTime,
  faqSummary,
  pickupPolicySummary,
  summarizeBusinessHours,
  upcomingClosures,
} from './summaries';
import { hmToTimeIso } from './time';

const open = (dayOfWeek: number, start: string, end: string) => ({
  dayOfWeek,
  isClosed: false,
  openTime: hmToTimeIso(start),
  closeTime: hmToTimeIso(end),
});
const closed = (dayOfWeek: number) => ({ dayOfWeek, isClosed: true });

describe('summarizeBusinessHours', () => {
  it.each([
    ['행이 없으면', [], '설정 안 됨'],
    [
      '평일·토·일',
      [1, 2, 3, 4, 5].map((d) => open(d, '10:00', '19:00')).concat([open(6, '10:00', '17:00')]),
      '월–금 10:00–19:00 · 토 10:00–17:00 · 일 휴무',
    ],
    [
      '매일 같으면 한 묶음',
      [0, 1, 2, 3, 4, 5, 6].map((d) => open(d, '09:00', '18:00')),
      '월–일 09:00–18:00',
    ],
    [
      '휴무 요일 사이에 끼면 나뉜다',
      [open(1, '10:00', '19:00'), closed(2), open(3, '10:00', '19:00')],
      '월 10:00–19:00 · 화 휴무 · 수 10:00–19:00 · 목–일 휴무',
    ],
  ])('%s', (_, rows, expected) => {
    expect(summarizeBusinessHours(rows)).toBe(expected);
  });

  it('isClosed가 아니어도 시각이 비면 휴무로 본다', () => {
    expect(
      summarizeBusinessHours([{ dayOfWeek: 1, isClosed: false, openTime: null, closeTime: null }]),
    ).toBe('월–일 휴무');
  });
});

describe('describeLeadTime', () => {
  it.each([
    [0, '바로 주문 가능'],
    [30, '30분 전 마감'],
    [60, '1시간 전 마감'],
    [90, '1시간 30분 전 마감'],
    [1440, '하루 전 마감'],
    [2880, '2일 전 마감'],
    [1500, '25시간 전 마감'],
  ])('%d분 → %s', (minutes, expected) => {
    expect(describeLeadTime(minutes)).toBe(expected);
  });

  it('픽업 정책 한 줄 요약', () => {
    expect(
      pickupPolicySummary({
        pickupSlotIntervalMinutes: 30,
        minLeadTimeMinutes: 1440,
        maxDaysAhead: 14,
      }),
    ).toBe('30분 간격 · 하루 전 마감 · 14일 전까지');
  });
});

describe('특별휴무 요약', () => {
  const items = [
    { id: '3', closureDate: '2026-10-23T00:00:00.000Z' },
    { id: '1', closureDate: '2026-10-05T00:00:00.000Z' },
    { id: '2', closureDate: '2026-10-09T00:00:00.000Z' },
    { id: '4', closureDate: '2026-10-06T00:00:00.000Z' },
  ];

  it('지난 날짜를 빼고 오늘부터 날짜순으로 둔다', () => {
    expect(upcomingClosures(items, '2026-10-06').map((c) => c.ymd)).toEqual([
      '2026-10-06',
      '2026-10-09',
      '2026-10-23',
    ]);
  });

  it.each([
    [[], '예정된 휴무 없음'],
    [[{ ymd: '2026-10-09' }], '10월 9일'],
    [[{ ymd: '2026-10-09' }, { ymd: '2026-10-23' }], '10월 9일 외 1건'],
  ])('%p → %s', (upcoming, expected) => {
    expect(closuresSummary(upcoming)).toBe(expected);
  });

  it.each([
    [[], '등록된 항목 없음'],
    [[{ isActive: true }, { isActive: false }, { isActive: true }], '활성 2개 · 전체 3'],
  ])('FAQ %p → %s', (topics, expected) => {
    expect(faqSummary(topics)).toBe(expected);
  });
});
