import { SIDE_POSES } from './poses';
import { projectSidePoint } from './three/side-projection';

const yaw = (kind: string) => SIDE_POSES.find((p) => p.kind === kind)!.yaw;

describe('SIDE_POSES', () => {
  it('앞·뒤·왼쪽·오른쪽 순서로 캡처 종류와 같은 자세를 둔다', () => {
    expect(SIDE_POSES.map((p) => [p.kind, p.label])).toEqual([
      ['THREE_D_FRONT', '앞'],
      ['THREE_D_BACK', '뒤'],
      ['THREE_D_LEFT', '왼쪽'],
      ['THREE_D_RIGHT', '오른쪽'],
    ]);
  });

  // 정면에서 볼 때 화면 왼쪽(x < 0)에 있는 옆면이 왼쪽 자세에서 카메라를 정면으로 본다
  it.each([
    ['THREE_D_FRONT', 0],
    ['THREE_D_LEFT', 0.25],
    ['THREE_D_BACK', 0.5],
    ['THREE_D_RIGHT', 0.75],
  ])('%s는 둘레 %s 지점이 카메라를 정면으로 본다', (kind, u) => {
    expect(projectSidePoint('circle', u, 0.5, yaw(kind)).facing).toBeCloseTo(1, 2);
    expect(projectSidePoint('circle', u, 0.5, yaw(kind)).x).toBeCloseTo(0, 2);
  });

  it('둘레 0.25 지점은 정면에서 화면 왼쪽에 있다(좌·우는 정면을 보는 사람 기준)', () => {
    expect(projectSidePoint('circle', 0.25, 0.5, 0).x).toBeLessThan(-0.9);
  });
});
