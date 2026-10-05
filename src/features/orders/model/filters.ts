import { type OrderStatusType } from '@/graphql/generated/graphql';
import {
  addDays,
  formatYmd,
  kstDayEndIso,
  kstDayStartIso,
  parseYmd,
  todayKst,
  type YmdDate,
} from '@/shared/lib/kst';

import { type OrderListVars } from '../api/orders';

/** KST 날짜 'YYYY-MM-DD', 양끝 포함 */
export interface DateRange {
  from: string;
  to: string;
}

export type PickupFilter = 'today' | 'week' | DateRange | null;

export interface OrderFilters {
  status: OrderStatusType | null;
  pickup: PickupFilter;
  created: DateRange | null;
  search: string;
}

export const DEFAULT_FILTERS: OrderFilters = {
  status: null,
  pickup: 'week',
  created: null,
  search: '',
};

export const NO_FILTERS: OrderFilters = { status: null, pickup: null, created: null, search: '' };

export function hasFilters(f: OrderFilters): boolean {
  return f.status !== null || f.pickup !== null || f.created !== null || f.search.trim() !== '';
}

/** 오늘이 속한 월~일 */
export function weekRange(today: YmdDate): DateRange {
  const weekday = new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay();
  const monday = addDays(today, -((weekday + 6) % 7));
  return { from: formatYmd(monday), to: formatYmd(addDays(monday, 6)) };
}

export function pickupRange(pickup: PickupFilter, today: YmdDate): DateRange | null {
  if (pickup === 'today') return { from: formatYmd(today), to: formatYmd(today) };
  if (pickup === 'week') return weekRange(today);
  return pickup;
}

function toIsoRange(range: DateRange | null): [string, string] | null {
  const from = range && parseYmd(range.from);
  const to = range && parseYmd(range.to);
  return from && to ? [kstDayStartIso(from), kstDayEndIso(to)] : null;
}

/** 화면 필터 → sellerOrderList input. 날짜는 KST 하루 경계를 UTC ISO로, 빈 값은 보내지 않는다 */
export function toListVars(f: OrderFilters, now: Date = new Date()): OrderListVars {
  const vars: OrderListVars = {};
  if (f.status) vars.status = f.status;
  const search = f.search.trim();
  if (search) vars.search = search;
  const pickup = toIsoRange(pickupRange(f.pickup, todayKst(now)));
  if (pickup) [vars.fromPickupAt, vars.toPickupAt] = pickup;
  const created = toIsoRange(f.created);
  if (created) [vars.fromCreatedAt, vars.toCreatedAt] = created;
  return vars;
}

/** 칩 문구 '10/8~10/12', 하루면 '10/8' */
export function formatRange({ from, to }: DateRange): string {
  const short = (s: string) => {
    const d = parseYmd(s);
    return d ? `${d.m}/${d.d}` : s;
  };
  return from === to ? short(from) : `${short(from)}~${short(to)}`;
}

/** 달력에서 두 번 눌러 기간을 고른다. 끝이 시작보다 앞이면 새 시작으로 */
export function pickRangeDay(draft: { from: string | null; to: string | null }, ymd: string) {
  if (!draft.from || draft.to || ymd < draft.from) return { from: ymd, to: null };
  return { from: draft.from, to: ymd };
}

/** 기간 안 날짜 전부(달력 강조용) */
export function daysInRange(from: string, to: string | null): string[] {
  const start = parseYmd(from);
  const end = to ? parseYmd(to) : start;
  if (!start || !end) return [];
  const days: string[] = [];
  for (let d = start; formatYmd(d) <= formatYmd(end); d = addDays(d, 1)) days.push(formatYmd(d));
  return days;
}
