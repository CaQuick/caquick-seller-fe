// 구매자 편집기와 같은 코드다. 구매자 쪽이 바뀌면 같이 옮기고 골든 fixture를 다시 만든다(golden.spec이 1e-9로 비교).
import { type Ring } from 'polygon-clipping';
import * as THREE from 'three';

import { type ShapeId } from '../design-json';

import { CENTER, sheetOutline } from './sheet-outline';
import { SHEET_HEIGHT } from './side-projection';

/** 시트 본체 모서리를 둥글게 깎는 두께 */
export const BEVEL = 0.03;

/** viewBox 100 좌표를 중심 기준 -1~1 로 옮기고 세로 방향을 뒤집는다. */
const toShapePoints = (ring: Ring) =>
  ring
    .slice(0, -1)
    .map(([x, y]) => new THREE.Vector2((x - CENTER) / CENTER, -(y - CENTER) / CENTER));

/** 시트 모양 외곽선을 three 의 Shape 목록으로 만든다 (바깥 고리 + 구멍). */
export function createSheetShapes(shape: ShapeId): THREE.Shape[] {
  return sheetOutline(shape).map(([outer, ...holes]) => {
    const sheet = new THREE.Shape(toShapePoints(outer!));
    sheet.holes = holes.map((hole) => new THREE.Path(toShapePoints(hole)));
    return sheet;
  });
}

/** 시트 본체. 높이 방향 중심을 원점에 맞추고, 모양이 바닥(XZ 평면)에 눕도록 세운다. */
export function createSheetBodyGeometry(shape: ShapeId) {
  const geometry = new THREE.ExtrudeGeometry(createSheetShapes(shape), {
    depth: SHEET_HEIGHT - BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelOffset: -BEVEL,
    bevelSegments: 4,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -(SHEET_HEIGHT - BEVEL * 2) / 2);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
