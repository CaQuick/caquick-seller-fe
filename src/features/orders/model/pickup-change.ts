import {
  formatTimeKst,
  formatYmd,
  kstParts,
  kstToIso,
  parseYmd,
  todayKst,
  type YearMonth,
} from '@/shared/lib/kst';
import { type CalendarDay, type TimelineItem } from '@/shared/ui';

import { formatDateTime } from './format';

export const PICKUP_CHANGE_COPY = {
  open: '픽업 일시 변경',
  title: '픽업 일시를 바꿀까요?',
  description: '바꾸면 구매자에게 알림이 가요. 주문 내용은 그대로예요.',
  confirm: '변경',
  done: '픽업 일시를 바꿨어요',
  pickDay: '바꿀 날짜를 골라 주세요',
  noSlots: '이날은 픽업 시간이 없어요',
  history: '픽업 변경 이력',
} as const;

interface PickupDay {
  date: string;
  selectable: boolean;
  /** PAST | OUT_OF_RANGE | CLOSED | CAPACITY_FULL */
  reason?: string | null;
}

/** 달력 칸: 휴무·마감은 표시하고 지난 날·예약 가능 기간 밖은 흐리게. 고를 수 있는 날만 따로 돌려준다 */
export function changeCalendar(days: readonly PickupDay[]) {
  const marks: Record<string, CalendarDay> = {};
  const blocked = new Set<string>();
  const selectable = new Set<string>();
  for (const d of days) {
    if (d.selectable) selectable.add(d.date);
    else if (d.reason === 'CLOSED') marks[d.date] = { state: 'off', caption: '휴무' };
    else if (d.reason === 'CAPACITY_FULL') marks[d.date] = { state: 'full', caption: '마감' };
    else blocked.add(d.date);
  }
  return { marks, blocked, selectable };
}

export interface SlotChip {
  time: string;
  label: string;
  disabled: boolean;
}

/** 슬롯 칩. 지금 픽업 시각은 같은 일시라 바꿀 수 없어(PICKUP_UNCHANGED) '현재'로 막는다 */
export function slotChips(
  slots: readonly { time: string; available: boolean }[],
  date: string,
  currentPickupAt: string,
): SlotChip[] {
  const current = formatYmd(kstParts(currentPickupAt)) === date && formatTimeKst(currentPickupAt);
  return slots.map((s) =>
    s.time === current
      ? { time: s.time, label: `${s.time} 현재`, disabled: true }
      : { time: s.time, label: s.time, disabled: !s.available },
  );
}

/** KST 'YYYY-MM-DD' + 'HH:mm' → 전송용 ISO. 형식이 어긋나면 null */
export function toPickupAt(date: string, time: string): string | null {
  const ymd = parseYmd(date);
  const hm = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!ymd || !hm) return null;
  return kstToIso({ ...ymd, hh: Number(hm[1]), mm: Number(hm[2]) });
}

/** 시트를 처음 열 달과 날짜: 픽업이 아직 앞이면 그날, 지났으면 이번 달에서 고르게 한다 */
export function initialPick(
  pickupAt: string,
  now: Date,
): { month: YearMonth; date: string | null } {
  if (Date.parse(pickupAt) > now.getTime()) {
    const k = kstParts(pickupAt);
    return { month: { y: k.y, m: k.m }, date: formatYmd(k) };
  }
  const today = todayKst(now);
  return { month: { y: today.y, m: today.m }, date: null };
}

export const monthKeyOf = (month: YearMonth) => formatYmd({ ...month, d: 1 }).slice(0, 7);

/** 변경 이력(오래된 순) → 타임라인 행 */
export function pickupChangeItems(
  changes: readonly {
    id: string;
    fromPickupAt: string;
    toPickupAt: string;
    changedAt: string;
    note?: string | null;
  }[],
): TimelineItem[] {
  return changes.map((c) => ({
    key: c.id,
    title: `${formatDateTime(c.fromPickupAt)} → ${formatDateTime(c.toPickupAt)}`,
    state: 'done',
    at: `${formatDateTime(c.changedAt)} 변경`,
    memo: c.note ?? undefined,
  }));
}
