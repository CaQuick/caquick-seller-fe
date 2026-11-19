// 구매자 편집기와 같은 코드다. 구매자 쪽이 바뀌면 같이 옮기고 골든 fixture를 다시 만든다(golden.spec이 1e-9로 비교).
import polygonClipping, {
  type MultiPolygon,
  type Pair,
  type Polygon,
  type Ring,
} from 'polygon-clipping';
import { type ShapeId } from '../design-json';

/** 시트 모양 외곽선은 100x100 viewBox 좌표계(구매자 편집기 CakeShape와 같음)로 정의한다. three 에 의존하지 않는다. */
export const CENTER = 50;
const CIRCLE_SEGMENTS = 64;
const CURVE_SEGMENTS = 24;

const circle = (cx: number, cy: number, r: number): Ring => {
  const points: Pair[] = Array.from({ length: CIRCLE_SEGMENTS }, (_, i) => {
    const angle = (Math.PI * 2 * i) / CIRCLE_SEGMENTS;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  });
  return [...points, points[0]!];
};

const roundedRect = (x: number, y: number, w: number, h: number, r: number): Ring => {
  const points: Pair[] = [];
  const corners: [number, number, number][] = [
    [x + w - r, y + r, -Math.PI / 2],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ];
  corners.forEach(([cx, cy, start]) => {
    for (let i = 0; i <= 8; i++) {
      const angle = start + (Math.PI / 2) * (i / 8);
      points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
  });
  return [...points, points[0]!];
};

const polygon = (points: Pair[]): Ring => [...points, points[0]!];

/** 꼭짓점과 변을 radius 만큼 부풀려 모서리를 둥글게 한다 (SVG 의 둥근 외곽선 덧그리기와 같은 효과). */
const roundedPolygon = (points: Pair[], radius: number): MultiPolygon => {
  const parts: Polygon[] = [[polygon(points)]];
  points.forEach(([x, y], i) => {
    parts.push([circle(x, y, radius)]);
    const [nx, ny] = points[(i + 1) % points.length]!;
    const length = Math.hypot(nx - x, ny - y);
    const ox = (-(ny - y) / length) * radius;
    const oy = ((nx - x) / length) * radius;
    parts.push([
      polygon([
        [x + ox, y + oy],
        [nx + ox, ny + oy],
        [nx - ox, ny - oy],
        [x - ox, y - oy],
      ]),
    ]);
  });
  const [first, ...rest] = parts;
  return polygonClipping.union(first!, ...rest);
};

type Cubic = [Pair, Pair, Pair, Pair];

const HEART_CURVES: Cubic[] = [
  [
    [50, 94],
    [22, 72],
    [4, 52],
    [4, 31],
  ],
  [
    [4, 31],
    [4, 15],
    [16, 6],
    [29, 6],
  ],
  [
    [29, 6],
    [39, 6],
    [47, 12],
    [50, 21],
  ],
  [
    [50, 21],
    [53, 12],
    [61, 6],
    [71, 6],
  ],
  [
    [71, 6],
    [84, 6],
    [96, 15],
    [96, 31],
  ],
  [
    [96, 31],
    [96, 52],
    [78, 72],
    [50, 94],
  ],
];

const heart = (): Ring => {
  const points: Pair[] = [];
  HEART_CURVES.forEach(([p0, p1, p2, p3]) => {
    for (let i = 0; i < CURVE_SEGMENTS; i++) {
      const t = i / CURVE_SEGMENTS;
      const u = 1 - t;
      points.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
  });
  return polygon(points);
};

const union = (...rings: Ring[]): MultiPolygon => {
  const [first, ...rest] = rings;
  return polygonClipping.union([first!], ...rest.map((ring): Polygon => [ring]));
};

const FLOWER_PETALS: Ring[] = Array.from({ length: 8 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 8;
  return circle(CENTER + Math.cos(angle) * 30, CENTER + Math.sin(angle) * 30, 17);
});

export const sheetOutline = (shape: ShapeId): MultiPolygon => {
  switch (shape) {
    case 'circle':
      return [[circle(CENTER, CENTER, 46)]];
    case 'square':
      return [[roundedRect(6, 6, 88, 88, 16)]];
    case 'heart':
      return [[heart()]];
    case 'star':
      return roundedPolygon(
        [
          [50, 10],
          [66, 32],
          [92, 40],
          [76, 62],
          [76, 90],
          [50, 81],
          [24, 90],
          [24, 62],
          [8, 40],
          [34, 32],
        ],
        3,
      );
    case 'triangle':
      return roundedPolygon(
        [
          [50, 10],
          [92, 86],
          [8, 86],
        ],
        5,
      );
    case 'bear':
      return union(circle(50, 56, 38), circle(22, 22, 14), circle(78, 22, 14));
    case 'clover':
      return union(
        circle(50, 27, 22),
        circle(73, 50, 22),
        circle(50, 73, 22),
        circle(27, 50, 22),
        polygon([
          [30, 30],
          [70, 30],
          [70, 70],
          [30, 70],
        ]),
      );
    case 'flower':
      return union(...FLOWER_PETALS, circle(CENTER, CENTER, 30));
  }
};
