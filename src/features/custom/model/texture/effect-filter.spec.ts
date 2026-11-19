/**
 * @jest-environment ./src/test/skia-environment.js
 */
import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';

import { pixelAt } from '@/test/skia';

import { type DesignItem } from '../design-json';
import { effectImageFilter, type EffectParams, effectParams } from './effect-filter';

type EffectType = DesignItem['effect']['type'];

/** params를 구매자 effectFilter + scaleEffectFilter가 만드는 CSS 문자열 모양으로 되돌린다 */
function toCss(params: EffectParams | null) {
  switch (params?.type) {
    case 'soft':
      return `drop-shadow(0 ${params.dy}px ${params.blur}px rgba(0,0,0,${params.alpha.toFixed(2)}))`;
    case 'drawing': {
      const w = params.width;
      return [`${w}px 0px`, `-${w}px 0px`, `0px ${w}px`, `0px -${w}px`]
        .map((offset) => `drop-shadow(${offset} 0 #2d2d2d)`)
        .join(' ');
    }
    case 'pencil':
      return `grayscale(${params.grayscale.toFixed(2)}) contrast(${params.contrast.toFixed(2)})`;
    default:
      return null;
  }
}

// 기대값은 구매자 편집기(9ac455f) getEffectFilter → scaleEffectFilter(×3)를 그대로 돌린 문자열이다
describe('effectParams', () => {
  it.each<[EffectType, number, string | null]>([
    ['none', 0, null],
    ['none', 100, null],
    ['soft', 0, 'drop-shadow(0 3px 6px rgba(0,0,0,0.15))'],
    ['soft', 1, 'drop-shadow(0 3px 6.300000000000001px rgba(0,0,0,0.15))'],
    ['soft', 33, 'drop-shadow(0 6px 13.799999999999999px rgba(0,0,0,0.27))'],
    ['soft', 50, 'drop-shadow(0 7.5px 18px rgba(0,0,0,0.32))'],
    ['soft', 67, 'drop-shadow(0 9px 22.200000000000003px rgba(0,0,0,0.38))'],
    ['soft', 100, 'drop-shadow(0 12px 30px rgba(0,0,0,0.50))'],
    [
      'drawing',
      0,
      'drop-shadow(1.5px 0px 0 #2d2d2d) drop-shadow(-1.5px 0px 0 #2d2d2d) drop-shadow(0px 1.5px 0 #2d2d2d) drop-shadow(0px -1.5px 0 #2d2d2d)',
    ],
    [
      'drawing',
      33,
      'drop-shadow(3.9000000000000004px 0px 0 #2d2d2d) drop-shadow(-3.9000000000000004px 0px 0 #2d2d2d) drop-shadow(0px 3.9000000000000004px 0 #2d2d2d) drop-shadow(0px -3.9000000000000004px 0 #2d2d2d)',
    ],
    [
      'drawing',
      50,
      'drop-shadow(5.4px 0px 0 #2d2d2d) drop-shadow(-5.4px 0px 0 #2d2d2d) drop-shadow(0px 5.4px 0 #2d2d2d) drop-shadow(0px -5.4px 0 #2d2d2d)',
    ],
    [
      'drawing',
      100,
      'drop-shadow(9px 0px 0 #2d2d2d) drop-shadow(-9px 0px 0 #2d2d2d) drop-shadow(0px 9px 0 #2d2d2d) drop-shadow(0px -9px 0 #2d2d2d)',
    ],
    ['pencil', 0, 'grayscale(0.00) contrast(1.00)'],
    ['pencil', 1, 'grayscale(0.01) contrast(1.00)'],
    ['pencil', 33, 'grayscale(0.33) contrast(1.10)'],
    ['pencil', 50, 'grayscale(0.50) contrast(1.15)'],
    ['pencil', 67, 'grayscale(0.67) contrast(1.20)'],
    ['pencil', 100, 'grayscale(1.00) contrast(1.30)'],
  ])('%s %i → %s', (type, intensity, css) => {
    expect(toCss(effectParams({ type, intensity }))).toBe(css);
  });
});

const SIZE = 64;
/** 가운데 32px 빨간 네모를 효과를 걸어 그린 픽셀(위 행부터) */
function draw(type: EffectType, intensity: number) {
  const surface = Skia.Surface.Make(SIZE, SIZE)!;
  const canvas = surface.getCanvas();
  const layer = Skia.Paint();
  const filter = effectImageFilter({ type, intensity });
  if (filter) layer.setImageFilter(filter);
  canvas.saveLayer(layer);
  const red = Skia.Paint();
  red.setColor(Skia.Color('rgb(220, 40, 60)'));
  canvas.drawRect(Skia.XYWHRect(16, 16, 32, 32), red);
  canvas.restore();
  surface.flush();
  const info = {
    width: SIZE,
    height: SIZE,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  };
  return surface.makeImageSnapshot().readPixels(0, 0, info) as Uint8Array;
}
const at = (data: Uint8Array, x: number, y: number) => pixelAt(data, SIZE, x, y);

describe('effectImageFilter', () => {
  it('효과 없음은 필터가 없다', () => {
    expect(effectImageFilter({ type: 'none', intensity: 80 })).toBeNull();
    expect(at(draw('none', 80), 32, 52)).toEqual([0, 0, 0, 0]);
  });

  // 그림자는 blur 길이를 표준편차로 쓴다: 강도가 셀수록 더 아래·더 멀리·더 진하게 번진다
  it.each([0, 50, 100])('soft %i는 네모 아래로 반투명 검은 그림자를 드리운다', (intensity) => {
    const data = draw('soft', intensity);
    const below = at(data, 32, 52);
    expect(below.slice(0, 3)).toEqual([0, 0, 0]);
    expect(below[3]).toBeGreaterThan(0);
    expect(below[3]).toBeLessThan(255 * 0.5);
    expect(at(data, 32, 32)).toEqual([220, 40, 60, 255]);
  });

  it('soft는 강도가 셀수록 그림자 전체가 진하다(네모 밖 알파 합)', () => {
    const shadowSum = (intensity: number) => {
      const data = draw('soft', intensity);
      let sum = 0;
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
          if (x < 16 || x >= 48 || y < 16 || y >= 48) sum += at(data, x, y)[3]!;
      return sum;
    };
    const sums = [0, 50, 100].map(shadowSum);
    expect(sums[0]).toBeLessThan(sums[1]!);
    expect(sums[1]).toBeLessThan(sums[2]!);
  });

  // Chrome canvas와 픽셀 대조로 정한 값: blur 길이 = 가우스 표준편차(blur/2면 이 자리의 알파가 3 안팎)
  it('soft 100의 그림자는 아래로 12px 밀리고 표준편차 30px로 번진다', () => {
    const surface = Skia.Surface.Make(200, 200)!;
    const canvas = surface.getCanvas();
    const layer = Skia.Paint();
    layer.setImageFilter(effectImageFilter({ type: 'soft', intensity: 100 }));
    canvas.saveLayer(layer);
    const red = Skia.Paint();
    red.setColor(Skia.Color('rgb(220, 40, 60)'));
    canvas.drawRect(Skia.XYWHRect(0, 0, 200, 100), red);
    canvas.restore();
    const info = {
      width: 200,
      height: 200,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    };
    const data = surface.makeImageSnapshot().readPixels(0, 0, info) as Uint8Array;
    // 그림자 가장자리(100 + 12)에서 1σ 아래: 0.5 × 255 × Φ(-1)
    expect(pixelAt(data, 200, 100, 142)[3]).toBeGreaterThanOrEqual(17);
    expect(pixelAt(data, 200, 100, 142)[3]).toBeLessThanOrEqual(23);
    expect(pixelAt(data, 200, 100, 112)[3]).toBeGreaterThanOrEqual(60);
    expect(pixelAt(data, 200, 100, 112)[3]).toBeLessThanOrEqual(67);
  });

  it.each([
    [0, 1],
    [50, 5],
    [100, 9],
  ])('drawing %i는 테두리 바깥 %ipx 안을 #2D2D2D 외곽선으로 채운다', (intensity, inside) => {
    const data = draw('drawing', intensity);
    expect(at(data, 16 - inside, 32)).toEqual([45, 45, 45, 255]);
    expect(at(data, 47 + inside, 32)).toEqual([45, 45, 45, 255]);
    expect(at(data, 32, 16 - inside)).toEqual([45, 45, 45, 255]);
    // 대각 모서리는 그림자의 그림자(차례로 건 결과)라 같이 채워진다
    expect(at(data, 16 - inside, 16 - inside)).toEqual([45, 45, 45, 255]);
    expect(at(data, 32, 32)).toEqual([220, 40, 60, 255]);
  });

  it('pencil 100은 회색(R=G=B)으로, 0은 원래 색 그대로, 50은 그 사이로 그린다', () => {
    const [r, g, b, a] = at(draw('pencil', 100), 32, 32);
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(a).toBe(255);
    expect(at(draw('pencil', 0), 32, 32)).toEqual([220, 40, 60, 255]);
    const half = at(draw('pencil', 50), 32, 32);
    expect(half[0]! - half[1]!).toBeGreaterThan(0);
    expect(half[0]! - half[1]!).toBeLessThan(220 - 40);
  });
});
