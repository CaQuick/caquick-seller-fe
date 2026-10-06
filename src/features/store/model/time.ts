import {
  addDays,
  addMonths,
  formatYmd,
  parseYmd,
  WEEKDAYS_KO,
  type YearMonth,
  type YmdDate,
} from '@/shared/lib/kst';

const p = (n: number) => String(n).padStart(2, '0');

/**
 * 영업시간은 BE `@db.Time` 컬럼이라 1970-01-01의 UTC 시·분이 곧 매장 벽시계(KST) 시각이다.
 * KST→UTC로 9시간을 빼면 10:00이 01:00으로 저장된다.
 */
export function hmToTimeIso(hm: string): string {
  const [h = 0, m = 0] = hm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m)).toISOString();
}

export function timeIsoToHm(iso: string): string {
  const d = new Date(iso);
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** 휴무·생산 수량 날짜는 `@db.Date` — UTC 자정이 그 KST 날짜다 */
export function ymdToDateIso(ymd: string): string {
  return `${ymd}T00:00:00.000Z`;
}

export function dateIsoToYmd(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export const monthKey = ({ y, m }: YearMonth) => `${y}-${p(m)}`;

/** 월 범위 조회(양끝 포함) */
export function monthDateRange(month: YearMonth): { fromDate: string; toDate: string } {
  const last = addDays({ ...addMonths(month, 1), d: 1 }, -1);
  return {
    fromDate: ymdToDateIso(formatYmd({ ...month, d: 1 })),
    toDate: ymdToDateIso(formatYmd(last)),
  };
}

function weekdayOf({ y, m, d }: YmdDate): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** '10월 9일 (금)' · long이면 '10월 9일 금요일' */
export function formatMonthDay(ymd: string, long = false): string {
  const date = parseYmd(ymd);
  if (!date) return ymd;
  const w = WEEKDAYS_KO[weekdayOf(date)];
  return long ? `${date.m}월 ${date.d}일 ${w}요일` : `${date.m}월 ${date.d}일 (${w})`;
}
