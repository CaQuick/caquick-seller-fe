/**
 * CSS linear-gradient 각도를 w×h 박스의 SVG userSpace 시작·끝점으로 바꾼다.
 * objectBoundingBox로 대각선을 잇으면 가로로 긴 카드에서 각도가 눕는다 — CSS 명세대로
 * 실제 픽셀 각도를 쓰고, 선 길이를 |w·sinθ|+|h·cosθ|로 둬 두 모서리가 0%·100%에 닿게 한다.
 */
export function cssGradientLine(angle: number, w: number, h: number) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  return {
    x1: w / 2 - dx * half,
    y1: h / 2 - dy * half,
    x2: w / 2 + dx * half,
    y2: h / 2 + dy * half,
  };
}
