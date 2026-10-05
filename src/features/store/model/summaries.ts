import { WEEKDAYS_KO } from '@/shared/lib/kst';

import { dateIsoToYmd, formatMonthDay, timeIsoToHm } from './time';

/** 화면은 월요일부터 */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export interface BusinessHourRow {
  dayOfWeek: number;
  isClosed: boolean;
  openTime?: string | null;
  closeTime?: string | null;
}

export const dayLabel = (day: number) => WEEKDAYS_KO[day] ?? '';

/** 행이 없거나 시각이 비면 BE 픽업 계산도 휴무로 본다 */
export function dayHours(rows: readonly BusinessHourRow[], day: number) {
  const row = rows.find((r) => r.dayOfWeek === day);
  if (!row || row.isClosed || !row.openTime || !row.closeTime) return null;
  return { start: timeIsoToHm(row.openTime), end: timeIsoToHm(row.closeTime) };
}

/** '월–금 10:00–19:00 · 토 10:00–17:00 · 일 휴무' — 같은 시간이 이어지는 요일을 묶는다 */
export function summarizeBusinessHours(rows: readonly BusinessHourRow[]): string {
  if (rows.length === 0) return '설정 안 됨';
  const groups: { first: number; last: number; label: string }[] = [];
  for (const day of DAY_ORDER) {
    const h = dayHours(rows, day);
    const label = h ? `${h.start}–${h.end}` : '휴무';
    const prev = groups.at(-1);
    if (prev?.label === label) prev.last = day;
    else groups.push({ first: day, last: day, label });
  }
  return groups
    .map(({ first, last, label }) => {
      const span = first === last ? dayLabel(first) : `${dayLabel(first)}–${dayLabel(last)}`;
      return `${span} ${label}`;
    })
    .join(' · ');
}

/** 1440 → '하루 전 마감' */
export function describeLeadTime(minutes: number): string {
  if (minutes <= 0) return '바로 주문 가능';
  if (minutes % 1440 === 0)
    return minutes === 1440 ? '하루 전 마감' : `${minutes / 1440}일 전 마감`;
  if (minutes < 60) return `${minutes}분 전 마감`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시간${m ? ` ${m}분` : ''} 전 마감`;
}

export function pickupPolicySummary(store: {
  pickupSlotIntervalMinutes: number;
  minLeadTimeMinutes: number;
  maxDaysAhead: number;
}): string {
  return [
    `${store.pickupSlotIntervalMinutes}분 간격`,
    describeLeadTime(store.minLeadTimeMinutes),
    `${store.maxDaysAhead}일 전까지`,
  ].join(' · ');
}

/** 지난 날짜를 빼고 날짜순 — 목록은 최신 등록순으로 온다 */
export function upcomingClosures<T extends { closureDate: string }>(
  items: readonly T[],
  todayYmd: string,
): (T & { ymd: string })[] {
  return items
    .map((item) => ({ ...item, ymd: dateIsoToYmd(item.closureDate) }))
    .filter((item) => item.ymd >= todayYmd)
    .sort((a, b) => a.ymd.localeCompare(b.ymd));
}

export function closuresSummary(upcoming: readonly { ymd: string }[]): string {
  const [first] = upcoming;
  if (!first) return '예정된 휴무 없음';
  const head = formatMonthDay(first.ymd).replace(/ \(.\)$/, '');
  return upcoming.length > 1 ? `${head} 외 ${upcoming.length - 1}건` : head;
}

export function faqSummary(topics: readonly { isActive: boolean }[]): string {
  if (topics.length === 0) return '등록된 항목 없음';
  return `활성 ${topics.filter((t) => t.isActive).length}개 · 전체 ${topics.length}`;
}
