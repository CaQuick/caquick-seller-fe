// 구매자 편집기와 같은 코드다. 구매자 쪽이 바뀌면 같이 옮기고 골든 fixture를 다시 만든다(golden.spec이 1e-9로 비교).
import * as THREE from 'three';

import { type DesignItem, type ShapeId } from '../design-json';

import {
  ITEM_WORLD_UNIT,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  sampleWall,
  wallPerimeter,
} from './side-projection';

export type CakeFace = 'top' | 'side';

/** 텍스트 텍스처를 그릴 때의 글자 크기(px). 화면에 보이는 크기는 지오메트리 크기가 정한다. */
export const TEXT_FONT_PX = 96;
/** 효과(그림자 등)가 잘리지 않도록 텍스처 가장자리에 두는 여백(px) */
export const DECAL_PAD = 24;
export const DECO_CANVAS = 256;
/** 데칼이 표면에 파묻히지 않도록 법선 방향으로 띄우는 거리 */
const WALL_OFFSET = 0.004;
/** 곡면을 따라 가로로 나누는 간격 (월드 단위) */
const COLUMN_STEP = 0.02;

export interface DecalPixels {
  width: number;
  height: number;
}

/**
 * 아이템 텍스처의 픽셀 크기. 글자 박스는 좌우 0.3em 여백, 최소 2em이다.
 * measureText는 래스터와 같은 글꼴(700, TEXT_FONT_PX)로 잰 한 줄 폭이다.
 * 구매자 Canvas 2D처럼 ASCII 공백(\t\n\f\r)은 공백으로 재고 그린다(줄바꿈도 한 줄).
 */
export function decalPixelSize(
  item: DesignItem,
  measureText: (text: string) => number,
): DecalPixels {
  if (item.kind !== 'TEXT') return { width: DECO_CANVAS, height: DECO_CANVAS };
  const box = Math.max(measureText(item.text) + TEXT_FONT_PX * 0.6, TEXT_FONT_PX * 2);
  return {
    width: Math.ceil(box + DECAL_PAD * 2),
    height: Math.ceil(TEXT_FONT_PX * 1.25 + DECAL_PAD * 2),
  };
}

/** 옆면 둘레를 따라 휘어지는 띠 모양 지오메트리. 가운데가 (u, v), 크기는 월드 단위이다. */
function createSideDecalGeometry(
  shape: ShapeId,
  u: number,
  v: number,
  width: number,
  height: number,
  lift: number,
) {
  const columns = Math.max(2, Math.ceil(width / COLUMN_STEP));
  const du = width / wallPerimeter(shape);
  const top = (0.5 - v) * SHEET_HEIGHT + height / 2;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= columns; i++) {
    // 둘레 위치 u 는 화면에서 왼쪽으로 갈수록 커진다. 텍스처는 왼쪽에서 오른쪽으로 읽는다.
    const point = sampleWall(shape, u + du * (0.5 - i / columns));
    const x = point.x + point.nx * (WALL_OFFSET + lift);
    const z = point.z + point.nz * (WALL_OFFSET + lift);
    positions.push(x, top, z, x, top - height, z);
    uvs.push(i / columns, 1, i / columns, 0);
    if (i < columns) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** 윗면 아이템 좌표(0~1)는 케이크 모양이 들어가는 정사각형(한 변 SHEET_WIDTH) 기준이다. */
function createTopDecalGeometry(x: number, y: number, width: number, height: number, lift: number) {
  const centerX = (x - 0.5) * SHEET_WIDTH;
  const centerZ = (y - 0.5) * SHEET_WIDTH;
  const surface = SHEET_HEIGHT / 2 + WALL_OFFSET + lift;
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const back = centerZ - height / 2;
  const front = centerZ + height / 2;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [left, surface, back, right, surface, back, left, surface, front, right, surface, front],
      3,
    ),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2));
  geometry.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3),
  );
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  return geometry;
}

/**
 * 아이템 텍스처를 입힐 스티커 판. 윗면은 평평한 판, 옆면은 둘레를 따라 휘는 띠라서
 * 모서리에서 꺾이고 케이크와 같은 조명을 받는다. lift는 시트 디자인 장식 위로 더 띄우는 높이다.
 */
export function createItemDecalGeometry(
  shape: ShapeId,
  face: CakeFace,
  item: DesignItem,
  pixels: DecalPixels,
  lift: number,
) {
  // 텍스트는 글자 크기, 꾸미기는 한 변 길이가 item.size(cqw)에 해당한다.
  const worldPerPixel =
    ((item.size / 100) * (face === 'top' ? SHEET_WIDTH : ITEM_WORLD_UNIT)) /
    (item.kind === 'TEXT' ? TEXT_FONT_PX : DECO_CANVAS - DECAL_PAD * 2);
  const width = pixels.width * worldPerPixel;
  const height = pixels.height * worldPerPixel;
  return face === 'top'
    ? createTopDecalGeometry(item.x, item.y, width, height, lift)
    : createSideDecalGeometry(shape, item.x, item.y, width, height, lift);
}
