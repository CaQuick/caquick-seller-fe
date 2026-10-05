/** className 조각 합치기. tailwind-merge 없이 — 충돌하는 유틸은 호출자가 피한다 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
