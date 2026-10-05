/** 한국 시간(UTC+9, DST 없음) 날짜 계산. Intl을 쓰지 않는다(Hermes 편차). 표시·입력은 KST, 전송은 UTC ISO. */
const KST_OFFSET_MS = 9 * 3600_000;
const MINUTE_MS = 60_000;

export interface YmdDate {
  y: number;
  m: number; // 1~12
  d: number;
}

export interface KstParts extends YmdDate {
  hh: number;
  mm: number;
  /** 0=일 … 6=토 */
  weekday: number;
}

const p = (n: number) => String(n).padStart(2, '0');

export const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function todayKst(now: Date = new Date()): YmdDate {
  const k = new Date(now.getTime() + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate() };
}

export function addDays(date: YmdDate, days: number): YmdDate {
  const k = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate() };
}

export function formatYmd({ y, m, d }: YmdDate): string {
  return `${y}-${p(m)}-${p(d)}`;
}

export function parseYmd(s: string): YmdDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const date = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  return formatYmd(addDays(date, 0)) === s ? date : null; // 2월 30일 같은 값 거부
}

/** KST 하루의 시작(00:00:00.000)을 UTC ISO로. */
export function kstDayStartIso(date: YmdDate): string {
  return new Date(Date.UTC(date.y, date.m - 1, date.d) - KST_OFFSET_MS).toISOString();
}

/** KST 하루의 끝(23:59:59.999)을 UTC ISO로. BE 기간 필터는 양끝 포함. */
export function kstDayEndIso(date: YmdDate): string {
  return new Date(Date.UTC(date.y, date.m - 1, date.d + 1) - KST_OFFSET_MS - 1).toISOString();
}

/** UTC ISO → KST 구성 요소. */
export function kstParts(iso: string): KstParts {
  const k = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  return {
    y: k.getUTCFullYear(),
    m: k.getUTCMonth() + 1,
    d: k.getUTCDate(),
    hh: k.getUTCHours(),
    mm: k.getUTCMinutes(),
    weekday: k.getUTCDay(),
  };
}

/** KST 날짜·시각 → UTC ISO. 피커 값 전송용. */
export function kstToIso({ y, m, d, hh = 0, mm = 0 }: YmdDate & { hh?: number; mm?: number }) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - KST_OFFSET_MS).toISOString();
}

/** ISO(UTC) → KST 표시 문자열 `MM-DD HH:mm`(withYear면 `YYYY-` 접두). */
export function formatKst(iso: string, withYear = false): string {
  const k = kstParts(iso);
  return `${withYear ? `${k.y}-` : ''}${p(k.m)}-${p(k.d)} ${p(k.hh)}:${p(k.mm)}`;
}

/** ISO(UTC) → `HH:mm`. */
export function formatTimeKst(iso: string): string {
  const k = kstParts(iso);
  return `${p(k.hh)}:${p(k.mm)}`;
}

/** ISO(UTC) → `M/d HH:mm`(푸시·주문 픽업 시각 표기). */
export function formatPickupKst(iso: string): string {
  const k = kstParts(iso);
  return `${k.m}/${k.d} ${p(k.hh)}:${p(k.mm)}`;
}

/**
 * 목록용 상대 시각: 방금(1분 미만) · n분 전(1시간 미만) · 오늘 HH:mm · 어제 HH:mm · MM-DD · 해가 다르면 YYYY-MM-DD.
 * 미래 시각(기기 시계 오차)은 '방금'.
 */
export function formatRelativeKst(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < MINUTE_MS) return '방금';
  if (diff < 60 * MINUTE_MS) return `${Math.floor(diff / MINUTE_MS)}분 전`;
  const t = kstParts(iso);
  const today = todayKst(now);
  const ymd = formatYmd(t);
  if (ymd === formatYmd(today)) return `오늘 ${p(t.hh)}:${p(t.mm)}`;
  if (ymd === formatYmd(addDays(today, -1))) return `어제 ${p(t.hh)}:${p(t.mm)}`;
  if (t.y !== today.y) return ymd;
  return `${p(t.m)}-${p(t.d)}`;
}
