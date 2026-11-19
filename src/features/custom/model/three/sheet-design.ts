// 구매자 편집기와 같은 코드다. 구매자 쪽이 바뀌면 같이 옮기고 골든 fixture를 다시 만든다(golden.spec이 1e-9로 비교).
import * as THREE from 'three';

import { type DesignId, type ShapeId } from '../design-json';

import { seededRandom } from './seeded-random';
import { createSheetShapes } from './sheet-geometry';
import { SHEET_HEIGHT, sampleWall, wallPerimeter } from './side-projection';

/** 옆면 위 장식이 모델 표면에서 시작하는 높이 간격 (z-fighting 방지) */
const BASE_OFFSET = 0.003;
/** 물결 마루가 표면에서 가장 많이 솟는 높이 */
const WAVE_AMPLITUDE = 0.045;
/** 둘레를 한 바퀴 도는 동안 물결이 반복되는 횟수. 정수여야 이음매가 맞는다. */
const WAVE_CYCLES = 7;
/** 위로 올라갈수록 물결이 옆으로 기우는 정도 */
const WAVE_SLANT = 1.5;
const WAVE_COLUMNS = 240;
const WAVE_ROWS = 20;
/** 위아래 모서리(둥글게 깎인 부분)를 피하는 여유 (월드 단위) */
const WAVE_EDGE_MARGIN = 0.05;

/** 하트 장식: 한 줄에 놓이는 간격(월드 단위)과 줄 높이(0 윗면 ~ 1 바닥) */
const HEART_SPACING = 0.2;
const HEART_ROWS = [0.3, 0.5, 0.7];
const HEART_SIZE = 0.04;
const HEART_HEIGHT = 0.03;

const SPARKLE_DOTS = 70;
const SPARKLE_STARS = 22;
const SPARKLE_HEIGHT = 0.012;

/** 흘림: 윗면을 덮고 가장자리로 흘러내린 크림 */
const DRIP_THICKNESS = 0.035;
const DRIP_COLUMNS = 480;
const DRIP_ROWS = 24;
/** 방울 사이 구간에도 깔리는 크림 띠의 길이 */
const DRIP_BASE_LENGTH = 0.07;
const DRIP_SPACING = 0.28;
/** 방울 끝이 부풀어 오르는 정도 (두께 배율) */
const DRIP_TIP_BULGE = 0.4;
/** 접촉 그림자가 방울 둘레로 번지는 폭 */
export const DRIP_SHADOW_GROW = 0.012;
/** 윗면 크림 덮개: 케이크 윗면 아래로 파묻히는 깊이, 평평한 두께, 둥근 모서리 두께 */
const CAP_SINK = 0.05;
const CAP_DEPTH = 0.01;
const CAP_BEVEL = 0.03;
/** 덮개 윗면이 케이크 윗면보다 솟은 높이 */
const CAP_RISE = CAP_DEPTH + 2 * CAP_BEVEL - CAP_SINK;
/** 옆면 크림이 덮개 가장자리와 만나는 높이 (케이크 윗면에서 아래로) */
const DRIP_TOP_DROP = CAP_SINK - CAP_BEVEL;

/** 디자인마다 옆면 위로 솟아오르는 높이 */
const WALL_LIFT: Partial<Record<DesignId, number>> = {
  wave: WAVE_AMPLITUDE,
  heart: HEART_HEIGHT,
  sparkle: SPARKLE_HEIGHT,
  drip: DRIP_THICKNESS * (1 + DRIP_TIP_BULGE),
};

/** 시트 디자인이 윗면 위로 솟아오르는 높이. 윗면 아이템 스티커를 이만큼 띄운다. */
export const designTopLift = (design: DesignId | null) => (design === 'drip' ? CAP_RISE : 0);

/**
 * 시트 디자인이 옆면 위로 솟아오르는 높이. 꾸미기 아이템 스티커가 장식에 파묻히지 않도록
 * 이만큼 띄워서 붙인다.
 */
export const designWallLift = (design: DesignId | null) =>
  (design === null ? undefined : WALL_LIFT[design]) ?? 0;

/** 옆면을 한 바퀴 감싸는 물결 요철 띠. 케이크와 같은 색으로 칠해 굴곡이 음영으로만 드러난다. */
export function createWaveGeometry(shape: ShapeId) {
  const top = SHEET_HEIGHT / 2 - WAVE_EDGE_MARGIN;
  const bottom = -SHEET_HEIGHT / 2 + WAVE_EDGE_MARGIN;

  const positions: number[] = [];
  for (let row = 0; row <= WAVE_ROWS; row++) {
    const v = row / WAVE_ROWS;
    // 위아래 가장자리에서는 높이가 0 이 되어 매끈하게 이어진다.
    const envelope = Math.sin(Math.PI * v) ** 0.6;
    const y = top + (bottom - top) * v;
    for (let column = 0; column < WAVE_COLUMNS; column++) {
      const u = column / WAVE_COLUMNS;
      const main = Math.sin(Math.PI * 2 * (u * WAVE_CYCLES + v * WAVE_SLANT));
      const detail = Math.sin(Math.PI * 2 * (u * 3 - v * 0.7) + 1.3);
      const ridge = 0.5 + 0.5 * (0.7 * main + 0.3 * detail);
      const distance = BASE_OFFSET + WAVE_AMPLITUDE * envelope * ridge;
      const point = sampleWall(shape, u);
      positions.push(point.x + point.nx * distance, y, point.z + point.nz * distance);
    }
  }

  const indices: number[] = [];
  for (let row = 0; row < WAVE_ROWS; row++) {
    for (let column = 0; column < WAVE_COLUMNS; column++) {
      const next = (column + 1) % WAVE_COLUMNS;
      const a = row * WAVE_COLUMNS + column;
      const b = row * WAVE_COLUMNS + next;
      const c = (row + 1) * WAVE_COLUMNS + column;
      const d = (row + 1) * WAVE_COLUMNS + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export interface WallPlacement {
  /** 둘레 위치 0~1 */
  u: number;
  /** 높이 0(윗면)~1(바닥) */
  v: number;
  scale: number;
}

/** 옆면에 세우는 작은 장식 하나의 변환. 바깥 법선 방향으로 서고 위쪽이 하늘을 향한다. */
export function wallInstanceMatrix(shape: ShapeId, { u, v, scale }: WallPlacement) {
  const wall = sampleWall(shape, u);
  // 화면 오른쪽 = 둘레 위치가 줄어드는 방향이라 법선을 시계 방향으로 90도 돌린 값이다.
  const right = new THREE.Vector3(wall.nz, 0, -wall.nx);
  const normal = new THREE.Vector3(wall.nx, 0, wall.nz);
  const matrix = new THREE.Matrix4()
    .makeBasis(right, new THREE.Vector3(0, 1, 0), normal)
    .scale(new THREE.Vector3(scale, scale, scale));
  return matrix.setPosition(wall.x, (0.5 - v) * SHEET_HEIGHT, wall.z);
}

/** 하트 모양을 도드라지게 눌러 만든 작은 입체 */
export const createHeartGeometry = () => {
  const geometry = new THREE.ExtrudeGeometry(createSheetShapes('heart'), {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.12,
    bevelOffset: -0.12,
    bevelSegments: 3,
  });
  geometry.scale(HEART_SIZE, HEART_SIZE, HEART_SIZE);
  return geometry;
};

export function heartPlacements(shape: ShapeId): WallPlacement[] {
  const perCircuit = Math.max(1, Math.round(wallPerimeter(shape) / HEART_SPACING));
  return HEART_ROWS.flatMap((v, row) =>
    Array.from({ length: perCircuit }, (_, i) => ({
      // 줄마다 반 칸씩 어긋나게 놓는다.
      u: (i + (row % 2) * 0.5) / perCircuit,
      v,
      scale: 1,
    })),
  );
}

export const createDotGeometry = () => new THREE.SphereGeometry(0.012, 8, 6);

/** 네 갈래 별 */
export const createStarGeometry = () => {
  const outline = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 === 0 ? 1 : 0.3;
    const angle = (Math.PI * 2 * i) / 8 + Math.PI / 2;
    const [x, y] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
    if (i === 0) outline.moveTo(x, y);
    else outline.lineTo(x, y);
  }
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.3, bevelEnabled: false });
  geometry.scale(0.03, 0.03, 0.03);
  return geometry;
};

/** 반짝이 점과 별의 자리. 모양과 관계없이 둘레 비율로 흩뿌린다. */
export function sparklePlacements() {
  const random = seededRandom(7);
  const scatter = (count: number, minScale: number, maxScale: number): WallPlacement[] =>
    Array.from({ length: count }, () => ({
      u: random(),
      v: 0.08 + random() * 0.84,
      scale: minScale + random() * (maxScale - minScale),
    }));
  return { dots: scatter(SPARKLE_DOTS, 0.5, 1.4), stars: scatter(SPARKLE_STARS, 0.6, 1.3) };
}

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/**
 * 윗가장자리에서 흘러내린 크림. 둘레를 따라 길이가 제각각인 방울이 달리고, 방울 끝은 둥글고 살짝 부풀어 있다.
 * grow 가 0 보다 크면 방울보다 조금 넓은 납작한 띠(접촉 그림자용)를 만든다.
 */
export function createDripGeometry(shape: ShapeId, grow = 0) {
  const perimeter = wallPerimeter(shape);
  const random = seededRandom(11);
  const count = Math.max(4, Math.round(perimeter / DRIP_SPACING));
  const drips = Array.from({ length: count }, (_, i) => ({
    center: ((i + 0.2 + random() * 0.6) / count) * perimeter,
    radius: 0.035 + random() * 0.03 + grow,
    length: 0.12 + random() * 0.38 + grow,
  }));

  /** 둘레 위치(월드 거리)에서 흘러내린 길이와, 가장 긴 방울의 옆 가장자리까지 남은 거리 */
  const profileAt = (distance: number) => {
    let length = DRIP_BASE_LENGTH + grow;
    let edge = Infinity;
    for (const drip of drips) {
      // 둘레는 한 바퀴 돌아 이어지므로 가장 가까운 쪽 거리를 쓴다.
      const raw = Math.abs(distance - drip.center);
      const d = Math.min(raw, perimeter - raw);
      if (d >= drip.radius) continue;
      const tip = drip.length - drip.radius + Math.sqrt(drip.radius ** 2 - d ** 2);
      if (tip > length) {
        length = tip;
        edge = drip.radius - d;
      }
    }
    return { length, edge };
  };

  const top = SHEET_HEIGHT / 2 - DRIP_TOP_DROP;
  const positions: number[] = [];
  for (let row = 0; row <= DRIP_ROWS; row++) {
    for (let column = 0; column < DRIP_COLUMNS; column++) {
      const u = column / DRIP_COLUMNS;
      const { length, edge } = profileAt(u * perimeter);
      const depth = (row / DRIP_ROWS) * length;
      const toTip = length - depth;
      let distance: number;
      if (grow > 0) {
        distance = BASE_OFFSET / 2;
      } else {
        // 끝으로 갈수록 얇아지되, 끝 바로 앞에서 한 번 부풀어 오른다.
        const bulge = 1 + DRIP_TIP_BULGE * Math.exp(-(((toTip - 0.05) / 0.04) ** 2));
        // 방울 옆 가장자리에서도 둥글게 얇아진다 (방울 사이 띠 구간은 그대로 둔다).
        const inTongue = smoothstep((depth - DRIP_BASE_LENGTH * 0.5) / (DRIP_BASE_LENGTH * 0.5));
        const side = 1 - inTongue * (1 - smoothstep(edge / 0.03));
        distance = BASE_OFFSET + DRIP_THICKNESS * bulge * smoothstep(toTip / 0.03) * side;
      }
      const point = sampleWall(shape, u);
      positions.push(point.x + point.nx * distance, top - depth, point.z + point.nz * distance);
    }
  }

  const indices: number[] = [];
  for (let row = 0; row < DRIP_ROWS; row++) {
    for (let column = 0; column < DRIP_COLUMNS; column++) {
      const next = (column + 1) % DRIP_COLUMNS;
      const a = row * DRIP_COLUMNS + column;
      const b = row * DRIP_COLUMNS + next;
      const c = (row + 1) * DRIP_COLUMNS + column;
      const d = (row + 1) * DRIP_COLUMNS + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** 케이크 윗면을 덮는 크림. 가장자리가 둥글게 불룩해서 흘러내린 크림으로 이어진다. */
export function createCapGeometry(shape: ShapeId) {
  const geometry = new THREE.ExtrudeGeometry(createSheetShapes(shape), {
    depth: CAP_DEPTH,
    bevelEnabled: true,
    bevelThickness: CAP_BEVEL,
    // 윗면은 케이크 모양보다 CAP_BEVEL 만큼 안쪽, 옆면은 크림 두께만큼 바깥쪽에 온다.
    bevelSize: CAP_BEVEL + DRIP_THICKNESS,
    bevelOffset: -CAP_BEVEL,
    bevelSegments: 4,
    curveSegments: 1,
  });
  geometry.translate(0, 0, SHEET_HEIGHT / 2 - CAP_SINK + CAP_BEVEL);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
