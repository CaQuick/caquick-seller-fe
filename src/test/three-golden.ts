// 3D 형상 골든 문서. 구매자 편집기 코드(scripts/three-golden.ts)와 판매자 이식본(three/golden.spec.ts)이
// 같은 입력으로 이 문서를 만들고, spec이 저장된 구매자 문서와 1e-9 안에서 비교한다.
import type * as THREE from 'three';

/** 구매자 레포(caquick-fe-v2) 기준 커밋 */
export const GOLDEN_REF = '9ac455f';
export const GOLDEN_FIXTURE = 'src/features/custom/model/three/__fixtures__/three-golden.json';
export const GOLDEN_TOLERANCE = 1e-9;

const SHAPES = [
  'heart',
  'circle',
  'square',
  'star',
  'triangle',
  'bear',
  'clover',
  'flower',
] as const;
const DESIGNS = ['wave', 'drip', 'phrase', 'heart', 'sparkle', null] as const;
type Shape = (typeof SHAPES)[number];
type Design = (typeof DESIGNS)[number];
type Face = 'top' | 'side';

export interface GoldenItem {
  kind: 'TEXT' | 'DECO';
  x: number;
  y: number;
  size: number;
  text: string;
}

interface Placement {
  u: number;
  v: number;
  scale: number;
}

interface SpinLike {
  angle: number;
  setInvalidate(invalidate: () => void): void;
  start(x: number, time: number): void;
  drag(x: number, time: number, width: number): void;
  end(time: number): void;
  set(angle: number): void;
  halt(): void;
  step(delta: number): boolean;
}

/** 양쪽 코드가 같은 값을 내야 하는 함수 묶음. 컴포넌트 안 계산은 구매자 쪽에서 컴포넌트를 불러 꺼낸다 */
export interface ThreeApi {
  constants: Record<string, number>;
  seededRandom: (seed: number) => () => number;
  sheetOutline: (shape: Shape) => number[][][][];
  createSheetShapes: (shape: Shape) => THREE.Shape[];
  body: (shape: Shape) => THREE.BufferGeometry;
  sampleWall: (shape: Shape, u: number) => { x: number; z: number; nx: number; nz: number };
  projectSidePoint: (
    shape: Shape,
    u: number,
    v: number,
    yaw: number,
  ) => { x: number; y: number; facing: number; visible: boolean };
  wallPerimeter: (shape: Shape) => number;
  sideViewFactor: (shape: Shape) => number;
  designTopLift: (design: Design) => number;
  designWallLift: (design: Design) => number;
  wave: (shape: Shape) => THREE.BufferGeometry;
  heart: (shape: Shape) => { geometry: THREE.BufferGeometry; placements: Placement[] };
  sparkle: (shape: Shape) => {
    dot: THREE.BufferGeometry;
    star: THREE.BufferGeometry;
    dots: Placement[];
    stars: Placement[];
  };
  drip: (shape: Shape) => {
    shadow: THREE.BufferGeometry;
    drip: THREE.BufferGeometry;
    cap: THREE.BufferGeometry;
  };
  wallMatrices: (shape: Shape, placements: Placement[]) => number[][];
  /** 글자 폭은 goldenMeasure로 잰다 */
  itemDecal: (shape: Shape, face: Face, item: GoldenItem, lift: number) => THREE.BufferGeometry;
  createSpin: () => SpinLike;
}

/** 래스터 글꼴 대신 쓰는 결정적 글자 폭(px). 넓은 글자와 소수 폭을 함께 둔다 */
export const goldenMeasure = (text: string) =>
  [...text].reduce((width, char) => width + ((char.codePointAt(0) ?? 0) > 255 ? 96 : 52.8), 0);

const WALL_US = [0, 0.05, 0.125, 0.3, 0.5, 0.66, 0.9, 0.9999, 1.25, -0.4];
const PROJECTIONS = [0, 0.1, 0.25, 0.37, 0.5, 0.75, 0.999, 1.3, -0.2].flatMap((u) =>
  [0, 0.5, 1].flatMap((v) =>
    [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7].map((yaw) => [u, v, yaw]),
  ),
);
const DECALS: { face: Face; design: Design; item: GoldenItem }[] = [
  {
    face: 'side',
    design: 'drip',
    item: { kind: 'TEXT', x: 0, y: 0.5, size: 12, text: 'HAPPY BIRTHDAY' },
  },
  {
    face: 'side',
    design: null,
    item: { kind: 'TEXT', x: 0.62, y: 0.3, size: 8, text: '생일 축하해 🎂' },
  },
  { face: 'side', design: 'wave', item: { kind: 'DECO', x: 0.95, y: 0.7, size: 30, text: '' } },
  { face: 'top', design: null, item: { kind: 'TEXT', x: 0.5, y: 0.5, size: 10, text: 'A' } },
  { face: 'top', design: 'drip', item: { kind: 'DECO', x: 0.2, y: 0.8, size: 20, text: '' } },
];

/** 큰 배열은 개수·합·제곱합·위치 가중합과 고른 간격 표본 8개로 줄인다 */
function digest(values: ArrayLike<number>) {
  let sum = 0;
  let sq = 0;
  let weighted = 0;
  for (let i = 0; i < values.length; i++) {
    const value = values[i]!;
    sum += value;
    sq += value * value;
    weighted += value * ((i % 97) + 1);
  }
  const picks = Math.min(8, values.length);
  const at = Array.from(
    { length: picks },
    (_, k) => values[Math.round((k * (values.length - 1)) / Math.max(1, picks - 1))]!,
  );
  return { n: values.length, sum, sq, weighted, at };
}

function geometryDigest(geometry: THREE.BufferGeometry) {
  const attributes = Object.keys(geometry.attributes)
    .sort()
    .map((name) => [name, digest(geometry.getAttribute(name).array)] as const);
  return {
    ...Object.fromEntries(attributes),
    index: geometry.index ? digest(geometry.index.array) : null,
    groups: geometry.groups.map(({ start, count, materialIndex }) => [start, count, materialIndex]),
  };
}

const placementValues = (placements: Placement[]) =>
  placements.flatMap(({ u, v, scale }) => [u, v, scale]);

const pointValues = (points: THREE.Vector2[]) => points.flatMap(({ x, y }) => [x, y]);

function shapeGolden(api: ThreeApi, shape: Shape) {
  const outline = api.sheetOutline(shape);
  const heart = api.heart(shape);
  const sparkle = api.sparkle(shape);
  const drip = api.drip(shape);
  return {
    outlineRings: outline.map((polygon) => polygon.map((ring) => ring.length)),
    outline: digest(outline.flat(3)),
    sheetShapes: api.createSheetShapes(shape).map((sheet) => ({
      outer: digest(pointValues(sheet.getPoints())),
      holes: sheet.holes.map((hole) => digest(pointValues(hole.getPoints()))),
    })),
    body: geometryDigest(api.body(shape)),
    perimeter: api.wallPerimeter(shape),
    viewFactor: api.sideViewFactor(shape),
    wall: WALL_US.map((u) => {
      const { x, z, nx, nz } = api.sampleWall(shape, u);
      return [x, z, nx, nz];
    }),
    projections: digest(
      PROJECTIONS.flatMap(([u, v, yaw]) => {
        const point = api.projectSidePoint(shape, u!, v!, yaw!);
        return [point.x, point.y, point.facing, point.visible ? 1 : 0];
      }),
    ),
    wave: geometryDigest(api.wave(shape)),
    heartPlacements: digest(placementValues(heart.placements)),
    heartMatrices: digest(api.wallMatrices(shape, heart.placements).flat()),
    sparkleMatrices: digest(api.wallMatrices(shape, [...sparkle.dots, ...sparkle.stars]).flat()),
    drip: geometryDigest(drip.drip),
    dripShadow: geometryDigest(drip.shadow),
    cap: geometryDigest(drip.cap),
    decals: DECALS.map(({ face, design, item }) =>
      geometryDigest(
        api.itemDecal(
          shape,
          face,
          item,
          face === 'top' ? api.designTopLift(design) : api.designWallLift(design),
        ),
      ),
    ),
  };
}

/** 끌기·관성·멈춤을 차례로 밟으며 프레임마다 각도와 다음 프레임 필요 여부를 남긴다 */
function spinGolden(api: ThreeApi) {
  const spin = api.createSpin();
  let invalidated = 0;
  spin.setInvalidate(() => {
    invalidated += 1;
  });
  const frames: number[] = [];
  const frame = (delta: number) => frames.push(spin.angle, spin.step(delta) ? 1 : 0);

  spin.drag(50, 0, 390);
  spin.end(0);
  spin.start(100, 1000);
  for (const [x, time] of [
    [130, 1016],
    [175, 1032],
    [240, 1048],
    [300, 1064],
  ] as const)
    spin.drag(x, time, 390);
  frame(1 / 60);
  spin.end(1070);
  for (let i = 0; i < 120; i++) frame(i % 3 === 0 ? 1 / 30 : 1 / 60);
  spin.set(1.2);
  frame(1 / 60);
  // 1ms 안의 연속 이동, 멈춘 채 손 떼기(관성 없음)
  spin.start(0, 5000);
  spin.drag(-80, 5016, 390);
  spin.drag(-90, 5016.5, 390);
  spin.end(5300);
  frame(1 / 60);
  spin.start(0, 6000);
  spin.drag(200, 6016, 390);
  spin.end(6020);
  frame(0.25);
  spin.halt();
  frame(1 / 60);
  return { frames, invalidated };
}

export function buildGolden(api: ThreeApi) {
  const sparkle = api.sparkle('circle');
  const heart = api.heart('circle');
  return {
    constants: api.constants,
    random: [7, 11, 42].map((seed) => {
      const random = api.seededRandom(seed);
      return Array.from({ length: 8 }, () => random());
    }),
    lifts: DESIGNS.map((design) => [api.designTopLift(design), api.designWallLift(design)]),
    heartGeometry: geometryDigest(heart.geometry),
    dotGeometry: geometryDigest(sparkle.dot),
    starGeometry: geometryDigest(sparkle.star),
    sparklePlacements: digest(placementValues([...sparkle.dots, ...sparkle.stars])),
    spin: spinGolden(api),
    shapes: Object.fromEntries(SHAPES.map((shape) => [shape, shapeGolden(api, shape)])),
  };
}

/** 숫자는 |a−b| ≤ 1e-9·max(1, |b|), 나머지는 같은 모양·같은 값이어야 한다. 어긋난 경로를 모두 돌려준다 */
export function goldenMismatches(actual: unknown, expected: unknown, path = '$'): string[] {
  if (typeof expected === 'number') {
    return typeof actual === 'number' &&
      Math.abs(actual - expected) <= GOLDEN_TOLERANCE * Math.max(1, Math.abs(expected))
      ? []
      : [`${path}: ${String(actual)} ≠ ${expected}`];
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length)
      return [
        `${path}: 길이 ${Array.isArray(actual) ? actual.length : '배열 아님'} ≠ ${expected.length}`,
      ];
    return expected.flatMap((value, i) => goldenMismatches(actual[i], value, `${path}[${i}]`));
  }
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object') return [`${path}: 객체 아님`];
    const keys = Object.keys(expected);
    const extra = Object.keys(actual).filter((key) => !keys.includes(key));
    return [
      ...extra.map((key) => `${path}.${key}: 기준에 없는 키`),
      ...keys.flatMap((key) =>
        goldenMismatches(
          (actual as Record<string, unknown>)[key],
          (expected as Record<string, unknown>)[key],
          `${path}.${key}`,
        ),
      ),
    ];
  }
  return Object.is(actual, expected) ? [] : [`${path}: ${String(actual)} ≠ ${String(expected)}`];
}
