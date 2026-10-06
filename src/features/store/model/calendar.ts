import { type CalendarDay } from '@/shared/ui';

import { dateIsoToYmd } from './time';

export interface PickupDayInfo {
  date: string;
  selectable: boolean;
  /** PAST | OUT_OF_RANGE | CLOSED | CAPACITY_FULL */
  reason?: string | null;
}

const PICKUP_STATE: Partial<Record<string, CalendarDay>> = {
  CLOSED: { state: 'off', caption: '휴무' },
  CAPACITY_FULL: { state: 'full', caption: '마감' },
};

/** 일별 생산 수량 칸: 설정한 수량을 캡션으로, 그 위에 구매자 달력의 휴무·마감을 덮는다 */
export function capacityCalendarDays(
  capacities: readonly { capacityDate: string; capacity: number }[],
  pickupDays: readonly PickupDayInfo[] = [],
): Record<string, CalendarDay> {
  const days: Record<string, CalendarDay> = {};
  for (const c of capacities) days[dateIsoToYmd(c.capacityDate)] = { caption: String(c.capacity) };
  for (const d of pickupDays) {
    const state = d.reason ? PICKUP_STATE[d.reason] : undefined;
    if (state) days[d.date] = state;
  }
  return days;
}

/** 구매자 달력 미리보기 칸: 휴무·마감만 표시하고 고를 수 없는 날(지난 날·범위 밖)은 따로 돌려준다 */
export function previewCalendar(pickupDays: readonly PickupDayInfo[]) {
  const days: Record<string, CalendarDay> = {};
  const blocked = new Set<string>();
  for (const d of pickupDays) {
    const state = d.reason ? PICKUP_STATE[d.reason] : undefined;
    if (state) days[d.date] = state;
    else if (!d.selectable) blocked.add(d.date);
  }
  return { days, blocked };
}

/** 슬롯 간격은 영업시간을 나누는 값 사이로만 움직인다 */
export const SLOT_INTERVALS = [10, 15, 30, 60] as const;

export function stepSlotInterval(current: number, direction: 1 | -1): number {
  const list = direction > 0 ? SLOT_INTERVALS : [...SLOT_INTERVALS].reverse();
  return list.find((v) => (direction > 0 ? v > current : v < current)) ?? current;
}
