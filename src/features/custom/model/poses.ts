import { type CustomImageKindType } from '@/graphql/generated/graphql';

export interface SidePose {
  kind: CustomImageKindType;
  label: string;
  /** 케이크가 세로축으로 돈 각도(rad) */
  yaw: number;
}

/**
 * 옆면 렌더 자세(구매자 캡처와 같은 값). 좌·우는 정면을 보는 사람 기준이라
 * 왼쪽 면을 보려면 케이크를 위에서 볼 때 반시계 방향(+)으로 90도 돌린다
 */
export const SIDE_POSES: readonly SidePose[] = [
  { kind: 'THREE_D_FRONT', label: '앞', yaw: 0 },
  { kind: 'THREE_D_BACK', label: '뒤', yaw: Math.PI },
  { kind: 'THREE_D_LEFT', label: '왼쪽', yaw: Math.PI / 2 },
  { kind: 'THREE_D_RIGHT', label: '오른쪽', yaw: -Math.PI / 2 },
];
