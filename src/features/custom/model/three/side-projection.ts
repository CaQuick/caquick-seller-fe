// 구매자 편집기와 같은 코드다. 구매자 쪽이 바뀌면 같이 옮기고 골든 fixture를 다시 만든다(golden.spec이 1e-9로 비교).
import { type ShapeId } from '../design-json';

import { CENTER, sheetOutline } from './sheet-outline';

/** 시트 모양 한 변을 2 로 본 월드 단위 기준 값들 (3D 모델과 같은 기준) */
export const SHEET_WIDTH = 2;
export const SHEET_HEIGHT = 0.8;
/** 스테이지 폭에서 케이크가 차지하는 비율 */
export const STAGE_FILL = 0.96;
/** 옆모습 카메라 고도. 윗면이 세로로 sin(고도) 만큼 눌려 보인다. */
export const SIDE_ELEVATION = Math.asin(0.4);

/** 아이템을 올릴 수 있는 옆면 띠의 폭(스테이지 폭 대비 %). 아이템 크기(cqw)의 기준이 된다. */
export const SIDE_BAND_PERCENT = 86;
/** 아이템 크기 100cqw 에 해당하는 월드 길이 (스테이지 폭 = 2 / STAGE_FILL 이고, 띠가 그 중 SIDE_BAND_PERCENT 를 차지한다) */
export const ITEM_WORLD_UNIT = ((SIDE_BAND_PERCENT / 100) * SHEET_WIDTH) / STAGE_FILL;

/** 옆면 둘레를 따라 촘촘히 찍어둔 점들 */
const WALL_SAMPLES = 720;
/** 이 값보다 카메라를 덜 향한 면(거의 옆으로 선 면)에는 아이템을 올리지 않는다. */
const MIN_FACING = 0.2;

interface Wall {
  x: Float64Array;
  z: Float64Array;
  /** 바깥쪽을 향하는 단위 법선 */
  nx: Float64Array;
  nz: Float64Array;
  /** 둘레 전체 길이 (월드 단위) */
  perimeter: number;
  /** 중심에서 가장 먼 점까지의 거리. 케이크를 돌릴 때 화면에서 차지하는 최대 반지름이다. */
  radius: number;
}

const walls = new Map<ShapeId, Wall>();

/**
 * 시트 외곽선을 둘레 길이 기준으로 균일하게 다시 나눈다. 아이템의 가로 위치(u, 0~1)는
 * 정면 중앙에서 시작해 이 둘레를 한 바퀴 도는 비율이다.
 */
function buildWall(shape: ShapeId): Wall {
  const polygons = sheetOutline(shape);
  const area = (ring: [number, number][]) =>
    ring.reduce((sum, [x, y], i) => {
      const [nx, ny] = ring[(i + 1) % ring.length]!;
      return sum + (x * ny - nx * y) / 2;
    }, 0);
  const outer = polygons
    .map(([ring]) => ring!.slice(0, -1) as [number, number][])
    .sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0]!;

  // 모델과 같은 좌표(가운데 0, 한 변 2)에서 정면이 +z 이다.
  let points = outer.map(([x, y]) => [(x - CENTER) / CENTER, (y - CENTER) / CENTER] as const);
  if (area(points.map(([x, z]) => [x, z])) < 0) points = points.reverse();

  const lengths = [0];
  points.forEach(([x, z], i) => {
    const [nx, nz] = points[(i + 1) % points.length]!;
    lengths.push(lengths[i]! + Math.hypot(nx - x, nz - z));
  });
  const total = lengths[lengths.length - 1]!;

  const sampledX = new Float64Array(WALL_SAMPLES);
  const sampledZ = new Float64Array(WALL_SAMPLES);
  let segment = 0;
  for (let k = 0; k < WALL_SAMPLES; k++) {
    const target = (k / WALL_SAMPLES) * total;
    while (lengths[segment + 1]! < target) segment++;
    const t = (target - lengths[segment]!) / (lengths[segment + 1]! - lengths[segment]! || 1);
    const [x0, z0] = points[segment]!;
    const [x1, z1] = points[(segment + 1) % points.length]!;
    sampledX[k] = x0 + (x1 - x0) * t;
    sampledZ[k] = z0 + (z1 - z0) * t;
  }

  // 정면(가운데에서 가장 앞쪽 점)이 u = 0 이 되도록 시작점을 옮긴다.
  let frontZ = -Infinity;
  for (let k = 0; k < WALL_SAMPLES; k++) {
    if (Math.abs(sampledX[k]!) < 0.08) frontZ = Math.max(frontZ, sampledZ[k]!);
  }
  // 정면이 평평한 모양(네모 등)은 그 면의 가운데를 고른다.
  let start = 0;
  let closest = Infinity;
  for (let k = 0; k < WALL_SAMPLES; k++) {
    if (sampledZ[k]! >= frontZ - 0.01 && Math.abs(sampledX[k]!) < closest) {
      closest = Math.abs(sampledX[k]!);
      start = k;
    }
  }

  const wall: Wall = {
    x: new Float64Array(WALL_SAMPLES),
    z: new Float64Array(WALL_SAMPLES),
    nx: new Float64Array(WALL_SAMPLES),
    nz: new Float64Array(WALL_SAMPLES),
    perimeter: total,
    radius: 0,
  };
  for (let k = 0; k < WALL_SAMPLES; k++) {
    const at = (offset: number) => (start + k + offset + WALL_SAMPLES) % WALL_SAMPLES;
    wall.x[k] = sampledX[at(0)]!;
    wall.z[k] = sampledZ[at(0)]!;
    const tx = sampledX[at(1)]! - sampledX[at(-1)]!;
    const tz = sampledZ[at(1)]! - sampledZ[at(-1)]!;
    const length = Math.hypot(tx, tz) || 1;
    wall.nx[k] = tz / length;
    wall.nz[k] = -tx / length;
    wall.radius = Math.max(wall.radius, Math.hypot(wall.x[k]!, wall.z[k]!));
  }
  return wall;
}

const getWall = (shape: ShapeId) => {
  let wall = walls.get(shape);
  if (!wall) {
    wall = buildWall(shape);
    walls.set(shape, wall);
  }
  return wall;
};

/** 옆면 둘레 위치 u 에서의 표면 점과 바깥쪽 법선 */
export function sampleWall(shape: ShapeId, u: number) {
  const wall = getWall(shape);
  const position = (((u % 1) + 1) % 1) * WALL_SAMPLES;
  const i = Math.floor(position) % WALL_SAMPLES;
  const j = (i + 1) % WALL_SAMPLES;
  const t = position - Math.floor(position);
  const lerp = (values: Float64Array) => values[i]! + (values[j]! - values[i]!) * t;
  const nx = lerp(wall.nx);
  const nz = lerp(wall.nz);
  const length = Math.hypot(nx, nz) || 1;
  return { x: lerp(wall.x), z: lerp(wall.z), nx: nx / length, nz: nz / length };
}

/**
 * 옆모습 카메라 배율(0~1). 케이크를 돌리면 모서리가 옆으로 튀어나와 화면 폭을 넘을 수 있어서,
 * 모양의 최대 반지름이 모델 한 변의 절반(1)보다 크면 그만큼 줄여 어느 각도에서도 잘리지 않게 한다.
 */
export const sideViewFactor = (shape: ShapeId) => Math.min(1, 1 / getWall(shape).radius);

export const wallPerimeter = (shape: ShapeId) => getWall(shape).perimeter;

const cosElevation = Math.cos(SIDE_ELEVATION);
const sinElevation = Math.sin(SIDE_ELEVATION);

export interface SideProjection {
  /** 월드 단위 화면 좌표 (가운데 0, 오른쪽 + / 위쪽 +) */
  x: number;
  y: number;
  /** 카메라를 향한 정도(0~1). 가로 방향으로 납작하게 보이는 비율로 쓴다. */
  facing: number;
  visible: boolean;
}

/** 옆면 위의 점(u: 둘레 위치 0~1, v: 높이 0 윗면~1 바닥)이 yaw 만큼 돌았을 때 화면 어디에 보이는지 */
export function projectSidePoint(
  shape: ShapeId,
  u: number,
  v: number,
  yaw: number,
): SideProjection {
  const wall = getWall(shape);
  const position = (((u % 1) + 1) % 1) * WALL_SAMPLES;
  const i = Math.floor(position) % WALL_SAMPLES;
  const j = (i + 1) % WALL_SAMPLES;
  const t = position - Math.floor(position);
  const lerp = (values: Float64Array) => values[i]! + (values[j]! - values[i]!) * t;

  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const x = lerp(wall.x);
  const z = lerp(wall.z);
  const height = (0.5 - v) * SHEET_HEIGHT;
  const facing = -lerp(wall.nx) * sin + lerp(wall.nz) * cos;

  return {
    x: x * cos + z * sin,
    y: height * cosElevation - (-x * sin + z * cos) * sinElevation,
    facing,
    visible: facing > MIN_FACING,
  };
}
