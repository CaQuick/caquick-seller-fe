import {
  avatarInitial,
  buyerName,
  formatDayLine,
  formatListTime,
  formatPickup,
  kstDayKey,
} from './format';

// 2026-10-06(화) 15:00 KST
const NOW = new Date('2026-10-06T06:00:00.000Z');

describe('formatListTime', () => {
  it.each([
    ['2026-10-06T05:59:30.000Z', '방금'],
    ['2026-10-06T06:05:00.000Z', '방금'],
    ['2026-10-06T05:50:00.000Z', '10분 전'],
    ['2026-10-06T03:00:00.000Z', '3시간 전'],
    ['2026-10-05T15:00:00.000Z', '15시간 전'], // KST 10/6 00:00
    ['2026-10-05T14:59:00.000Z', '어제'], // KST 10/5 23:59
    ['2026-10-03T03:00:00.000Z', '10월 3일'],
    ['2025-12-31T03:00:00.000Z', '2025년 12월 31일'],
  ])('%s → %s', (iso, expected) => {
    expect(formatListTime(iso, NOW)).toBe(expected);
  });
});

it('날짜 구분선은 KST 날짜와 요일', () => {
  expect(formatDayLine('2026-10-05T15:00:00.000Z')).toBe('10월 6일 화요일');
  expect(kstDayKey('2026-10-05T14:59:59.000Z')).toBe('2026-10-05');
});

it('픽업 보조 문구', () => {
  expect(formatPickup('2026-10-08T06:30:00.000Z')).toBe('10월 8일 15:30 픽업');
});

it.each([
  [null, '구매자', '구'],
  ['  ', '구매자', '구'],
  ['김다은', '김다은', '김'],
  ['😀케이크', '😀케이크', '😀'],
])('닉네임 %p → 표시 %s, 아바타 %s', (nickname, name, initial) => {
  expect(buyerName(nickname)).toBe(name);
  expect(avatarInitial(nickname)).toBe(initial);
});
