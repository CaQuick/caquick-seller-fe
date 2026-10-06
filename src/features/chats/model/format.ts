import { WEEKDAYS_KO, addDays, formatYmd, kstParts, todayKst } from '@/shared/lib/kst';

const MINUTE_MS = 60_000;

export function buyerName(nickname: string | null | undefined): string {
  // 빈 문자열·공백도 '구매자'로
  const name = nickname?.trim();
  if (name) return name;
  return '구매자';
}

/** 아바타 글자. 이모지·서로게이트 쌍이 반으로 잘리지 않게 코드포인트 단위로 */
export const avatarInitial = (nickname: string | null | undefined) =>
  Array.from(buyerName(nickname))[0]!;

/** 목록 시각: 방금 · N분 전 · N시간 전(오늘) · 어제 · M월 D일 · 해가 다르면 YYYY년 M월 D일. 미래 시각은 '방금' */
export function formatListTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - Date.parse(iso);
  if (diff < MINUTE_MS) return '방금';
  if (diff < 60 * MINUTE_MS) return `${Math.floor(diff / MINUTE_MS)}분 전`;
  const t = kstParts(iso);
  const today = todayKst(now);
  if (formatYmd(t) === formatYmd(today)) return `${Math.floor(diff / (60 * MINUTE_MS))}시간 전`;
  if (formatYmd(t) === formatYmd(addDays(today, -1))) return '어제';
  return t.y === today.y ? `${t.m}월 ${t.d}일` : `${t.y}년 ${t.m}월 ${t.d}일`;
}

/** 날짜 구분선: 10월 6일 화요일 */
export function formatDayLine(iso: string): string {
  const t = kstParts(iso);
  return `${t.m}월 ${t.d}일 ${WEEKDAYS_KO[t.weekday]}요일`;
}

export const kstDayKey = (iso: string) => formatYmd(kstParts(iso));

/** 주문 보기 보조 문구: 10월 8일 15:30 픽업 */
export function formatPickup(iso: string): string {
  const t = kstParts(iso);
  return `${t.m}월 ${t.d}일 ${String(t.hh).padStart(2, '0')}:${String(t.mm).padStart(2, '0')} 픽업`;
}
