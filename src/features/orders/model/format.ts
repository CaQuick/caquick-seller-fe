import { formatKrw } from '@/shared/lib/format';
import { kstParts, WEEKDAYS_KO, type YmdDate } from '@/shared/lib/kst';

const p2 = (n: number) => String(n).padStart(2, '0');

const weekdayOf = ({ y, m, d }: YmdDate) =>
  WEEKDAYS_KO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

/** '10월 8일 (목)' — 올해가 아니면 연도를 붙인다 */
export function formatDay(date: YmdDate, today: YmdDate): string {
  const year = date.y === today.y ? '' : `${date.y}년 `;
  return `${year}${date.m}월 ${date.d}일 (${weekdayOf(date)})`;
}

/** '10월 5일 20:14', weekday면 '10월 5일 (월) 20:14' */
export function formatDateTime(iso: string, weekday = false): string {
  const k = kstParts(iso);
  return `${k.m}월 ${k.d}일${weekday ? ` (${WEEKDAYS_KO[k.weekday]})` : ''} ${p2(k.hh)}:${p2(k.mm)}`;
}

/** 목록 행 픽업 시각: 오늘이면 '오늘 17:00', 아니면 '10월 8일 11:00' */
export function formatPickup(iso: string, today: YmdDate): string {
  const k = kstParts(iso);
  const time = `${p2(k.hh)}:${p2(k.mm)}`;
  return k.y === today.y && k.m === today.m && k.d === today.d
    ? `오늘 ${time}`
    : `${k.m}월 ${k.d}일 ${time}`;
}

/** 부호 붙은 금액: '+5,000원' · '+0원' · '-1,000원' */
export function formatSigned(amount: number): string {
  return `${amount < 0 ? '-' : '+'}${formatKrw(Math.abs(amount))}`;
}
