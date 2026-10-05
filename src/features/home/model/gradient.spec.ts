import { cssGradientLine } from './gradient';

/** 점 (x, y)가 그라디언트 선 위 몇 %에 오는지 */
function offsetAt(line: ReturnType<typeof cssGradientLine>, x: number, y: number) {
  const vx = line.x2 - line.x1;
  const vy = line.y2 - line.y1;
  return ((x - line.x1) * vx + (y - line.y1) * vy) / (vx * vx + vy * vy);
}

describe('cssGradientLine', () => {
  it.each([
    [0, { x1: 50, y1: 40, x2: 50, y2: 0 }],
    [90, { x1: 0, y1: 20, x2: 100, y2: 20 }],
    [180, { x1: 50, y1: 0, x2: 50, y2: 40 }],
    [270, { x1: 100, y1: 20, x2: 0, y2: 20 }],
  ])('%ideg는 CSS 방향(0=위, 90=오른쪽)대로 박스 끝에서 끝까지 잇는다', (angle, expected) => {
    const line = cssGradientLine(angle, 100, 40);
    for (const key of ['x1', 'y1', 'x2', 'y2'] as const)
      expect(line[key]).toBeCloseTo(expected[key]);
  });

  // 시안 히어로 338×191: 좌하 0%, 우상 100%
  it('45deg는 좌하·우상 모서리를 0%·100%에 둔다', () => {
    const line = cssGradientLine(45, 338, 191);
    expect(offsetAt(line, 0, 191)).toBeCloseTo(0);
    expect(offsetAt(line, 338, 0)).toBeCloseTo(1);
  });

  // 반증: 박스 비율로 늘린 대각선(objectBoundingBox)은 좌상 모서리가 50%에 놓인다
  it('반증: 45deg는 픽셀 각도라 가로로 긴 박스의 좌상 모서리가 50%가 아니라 36%다', () => {
    const line = cssGradientLine(45, 338, 191);
    expect(offsetAt(line, 0, 0)).toBeCloseTo(0.361, 3);
    expect(offsetAt(line, 338, 191)).toBeCloseTo(0.639, 3);
  });
});
