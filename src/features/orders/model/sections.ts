import { formatYmd, kstParts, type YmdDate } from '@/shared/lib/kst';

import { formatDay } from './format';

export interface OrderSection<T> {
  key: string;
  title: string;
  count: string;
  data: T[];
}

/** 픽업일(KST)별 묶음, 픽업 시각 오름차순. 오늘은 제목을 '오늘'로 하고 날짜를 건수 옆에 */
export function groupByPickupDay<T extends { pickupAt: string }>(
  items: readonly T[],
  today: YmdDate,
): OrderSection<T>[] {
  const sorted = [...items].sort((a, b) => Date.parse(a.pickupAt) - Date.parse(b.pickupAt));
  const sections: OrderSection<T>[] = [];
  for (const item of sorted) {
    const day = kstParts(item.pickupAt);
    const key = formatYmd(day);
    const last = sections.at(-1);
    if (last?.key === key) last.data.push(item);
    else sections.push({ key, title: '', count: '', data: [item] });
  }
  const todayKey = formatYmd(today);
  return sections.map((s) => {
    const label = formatDay(kstParts(s.data[0]!.pickupAt), today);
    const n = `${s.data.length}건`;
    return s.key === todayKey
      ? { ...s, title: '오늘', count: `${label} · ${n}` }
      : { ...s, title: label, count: n };
  });
}
