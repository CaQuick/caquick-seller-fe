/** 천 단위 구분. Hermes의 Intl은 플랫폼·OS 버전별 편차가 있어 직접 만든다. 소수부는 그대로 둔다. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const [integer = '0', fraction] = Math.abs(n).toString().split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

export function formatKrw(amount: number): string {
  return `${formatNumber(amount)}원`;
}

/** 수량 등 단위 접미. `formatCount(3, '개')` → '3개' */
export function formatCount(n: number, unit = ''): string {
  return `${formatNumber(n)}${unit}`;
}
