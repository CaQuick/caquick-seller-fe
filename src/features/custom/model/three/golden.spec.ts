import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as THREE from 'three';

import {
  buildGolden,
  GOLDEN_FIXTURE,
  GOLDEN_REF,
  goldenMeasure,
  goldenMismatches,
  type GoldenItem,
  type ThreeApi,
} from '@/test/three-golden';

import { type DesignItem } from '../design-json';

import {
  createItemDecalGeometry,
  DECAL_PAD,
  decalPixelSize,
  DECO_CANVAS,
  TEXT_FONT_PX,
} from './decal-geometry';
import { seededRandom } from './seeded-random';
import {
  createCapGeometry,
  createDotGeometry,
  createDripGeometry,
  createHeartGeometry,
  createStarGeometry,
  createWaveGeometry,
  designTopLift,
  designWallLift,
  DRIP_SHADOW_GROW,
  heartPlacements,
  sparklePlacements,
  wallInstanceMatrix,
} from './sheet-design';
import { BEVEL, createSheetBodyGeometry, createSheetShapes } from './sheet-geometry';
import { sheetOutline } from './sheet-outline';
import {
  ITEM_WORLD_UNIT,
  projectSidePoint,
  sampleWall,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  SIDE_BAND_PERCENT,
  SIDE_ELEVATION,
  sideViewFactor,
  STAGE_FILL,
  wallPerimeter,
} from './side-projection';
import { Spin } from './spin';

const fixture = JSON.parse(
  readFileSync(join(__dirname, '../../../../..', GOLDEN_FIXTURE), 'utf8'),
) as Record<string, unknown>;
const { ref, threeRevision, ...expected } = fixture;

const toDesignItem = ({ kind, x, y, size, text }: GoldenItem): DesignItem => {
  const base = { x, y, size, effect: { type: 'none' as const, intensity: 50 } };
  return kind === 'TEXT'
    ? { ...base, kind, text, color: '#1D1D1D' }
    : { ...base, kind, decoId: 'number-1' };
};

const seller: ThreeApi = {
  constants: {
    SHEET_WIDTH,
    SHEET_HEIGHT,
    STAGE_FILL,
    SIDE_ELEVATION,
    SIDE_BAND_PERCENT,
    ITEM_WORLD_UNIT,
    BEVEL,
    TEXT_FONT_PX,
    DECAL_PAD,
    DECO_CANVAS,
  },
  seededRandom,
  sheetOutline,
  createSheetShapes,
  body: createSheetBodyGeometry,
  sampleWall,
  projectSidePoint,
  wallPerimeter,
  sideViewFactor,
  designTopLift,
  designWallLift,
  wave: createWaveGeometry,
  heart: (shape) => ({ geometry: createHeartGeometry(), placements: heartPlacements(shape) }),
  sparkle: () => ({ dot: createDotGeometry(), star: createStarGeometry(), ...sparklePlacements() }),
  drip: (shape) => ({
    shadow: createDripGeometry(shape, DRIP_SHADOW_GROW),
    drip: createDripGeometry(shape),
    cap: createCapGeometry(shape),
  }),
  wallMatrices: (shape, placements) =>
    placements.map((placement) => [...wallInstanceMatrix(shape, placement).elements]),
  itemDecal: (shape, face, item, lift) => {
    const designItem = toDesignItem(item);
    const pixels = decalPixelSize(designItem, goldenMeasure);
    return createItemDecalGeometry(shape, face, designItem, pixels, lift);
  },
  createSpin: () => new Spin(),
};

describe('3D 형상 골든(구매자 편집기 기준)', () => {
  const actual = buildGolden(seller);

  it('fixture는 기준 커밋과 지금 설치된 three 판으로 만들었다', () => {
    expect(ref).toBe(GOLDEN_REF);
    expect(threeRevision).toBe(THREE.REVISION);
  });

  it('형상 정점·둘레 투영·데칼 지오메트리·회전 감쇠가 구매자 값과 1e-9 안에서 같다', () => {
    expect(Object.keys(expected)).toEqual(Object.keys(actual));
    expect(goldenMismatches(actual, expected)).toEqual([]);
  });

  // 비교가 실제로 잡는지: 이식본 한 곳을 조금만 바꾼 문서는 그 부분에서만 어긋난다
  it.each<[string, Partial<ThreeApi>, string]>([
    ['둘레 표본 u + 1e-6', { sampleWall: (shape, u) => sampleWall(shape, u + 1e-6) }, '.wall'],
    [
      '흘림 그림자 폭 × 1.001',
      {
        drip: (shape) => ({
          ...seller.drip(shape),
          shadow: createDripGeometry(shape, DRIP_SHADOW_GROW * 1.001),
        }),
      },
      '.dripShadow',
    ],
    ['물결을 원 둘레로', { wave: () => createWaveGeometry('circle') }, '.wave'],
    [
      '글자 폭 + 1px',
      {
        itemDecal: (shape, face, item, lift) => {
          const designItem = toDesignItem(item);
          const pixels = decalPixelSize(designItem, (text) => goldenMeasure(text) + 1);
          return createItemDecalGeometry(shape, face, designItem, pixels, lift);
        },
      },
      '.decals',
    ],
    [
      '프레임 시간 × 1.0001',
      {
        createSpin: () => {
          const spin = new Spin();
          const step = spin.step.bind(spin);
          spin.step = (delta) => step(delta * 1.0001);
          return spin;
        },
      },
      '$.spin.frames',
    ],
  ])('%s만 바꿔도 그 부분이 어긋난다', (_, override, section) => {
    const paths = goldenMismatches(buildGolden({ ...seller, ...override }), expected).map(
      (mismatch) => mismatch.split(':')[0]!,
    );
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((path) => !path.includes(section))).toEqual([]);
  });
});

describe('goldenMismatches', () => {
  it.each([
    ['1e-9 안의 차이', { a: 1 + 5e-10 }, { a: 1 }, []],
    ['1e-9를 넘는 차이', { a: 1 + 2e-9 }, { a: 1 }, ['$.a']],
    ['큰 값은 상대 오차', { a: 1e6 + 1e-4 }, { a: 1e6 }, []],
    ['큰 값의 상대 오차 초과', { a: 1e6 + 1e-2 }, { a: 1e6 }, ['$.a']],
    ['숫자 자리에 문자열', { a: '1' }, { a: 1 }, ['$.a']],
    ['배열 길이', { a: [1, 2] }, { a: [1] }, ['$.a']],
    ['배열 자리에 객체', { a: { 0: 1 } }, { a: [1] }, ['$.a']],
    ['빠진 키', {}, { a: null }, ['$.a']],
    ['남는 키', { a: 1, b: 2 }, { a: 1 }, ['$.b']],
    ['객체 자리에 null', { a: null }, { a: { b: 1 } }, ['$.a']],
    ['문자열 불일치', { a: 'x' }, { a: 'y' }, ['$.a']],
    ['깊은 경로', { a: [{ b: [0, 3] }] }, { a: [{ b: [0, 2] }] }, ['$.a[0].b[1]']],
  ])('%s', (_, actual, expected, paths) => {
    expect(goldenMismatches(actual, expected).map((m) => m.split(':')[0])).toEqual(paths);
  });
});
