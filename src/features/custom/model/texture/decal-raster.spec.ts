/**
 * @jest-environment ./src/test/skia-environment.js
 */
import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';
import * as THREE from 'three';

import { textWidth } from '@/shared/lib/skia-text';
import { pixelAt, pretendardFonts } from '@/test/skia';

import { type DesignItem } from '../design-json';
import { DECAL_PAD, decalPixelSize, DECO_CANVAS, TEXT_FONT_PX } from '../three/decal-geometry';
import { decalTexture, flipRows, MAX_TEXTURE_WIDTH, rasterizeDecal } from './decal-raster';

const fonts = pretendardFonts();
const measure = (text: string) => textWidth(fonts, text, TEXT_FONT_PX);

const textItem = (patch: Partial<Extract<DesignItem, { kind: 'TEXT' }>> = {}): DesignItem => ({
  kind: 'TEXT',
  x: 0.5,
  y: 0.5,
  size: 10,
  effect: { type: 'none', intensity: 0 },
  text: 'HAPPY',
  color: '#E5484D',
  ...patch,
});
const decoItem = (effect: DesignItem['effect'] = { type: 'none', intensity: 0 }): DesignItem => ({
  kind: 'DECO',
  x: 0.5,
  y: 0.5,
  size: 20,
  effect,
  decoId: 'number-1',
});

const raster = (item: DesignItem, image?: ReturnType<typeof Skia.Image.MakeImage>) =>
  rasterizeDecal(item, decalPixelSize(item, measure), { fonts, image, label: '1' });

/** 래스터 결과는 아래 행부터다 — 위에서 y번째 행의 픽셀 */
const fromTop = (bitmap: ReturnType<typeof rasterizeDecal>, x: number, y: number) =>
  pixelAt(bitmap.data, bitmap.width, x, bitmap.height - 1 - y);

/** 위 절반 빨강·아래 절반 파랑인 불투명 이미지 */
function twoTone(width: number, height: number) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      data.set(y < height / 2 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * width + x) * 4);
  return Skia.Image.MakeImage(
    { width, height, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
    Skia.Data.fromBytes(data),
    width * 4,
  );
}

const opaque = (bitmap: ReturnType<typeof rasterizeDecal>) => {
  let count = 0;
  for (let i = 3; i < bitmap.data.length; i += 4) if (bitmap.data[i] === 255) count++;
  return count;
};

describe('rasterizeDecal', () => {
  it('글자 텍스처는 decalPixelSize 크기이고 가운데에 글자색으로 그린다', () => {
    const item = textItem();
    const bitmap = raster(item);
    expect({ width: bitmap.width, height: bitmap.height }).toEqual(decalPixelSize(item, measure));
    expect(bitmap.height).toBe(Math.ceil(TEXT_FONT_PX * 1.25 + DECAL_PAD * 2));
    expect(opaque(bitmap)).toBeGreaterThan(1000);
    const colors = new Set<string>();
    for (let i = 0; i < bitmap.data.length; i += 4)
      if (bitmap.data[i + 3] === 255) colors.add(bitmap.data.slice(i, i + 3).join(','));
    expect([...colors]).toEqual(['229,72,77']);
    // 여백(PAD)에는 아무것도 없다
    for (let y = 0; y < bitmap.height; y++) expect(fromTop(bitmap, 2, y)[3]).toBe(0);
    // 대문자는 em 상자 가운데(textBaseline middle) 근처라 위아래 빈 줄 수가 거의 같다
    const inked = [...Array(bitmap.height).keys()].filter((y) =>
      [...Array(bitmap.width).keys()].some((x) => fromTop(bitmap, x, y)[3]! > 0),
    );
    const above = inked[0]!;
    const below = bitmap.height - 1 - inked[inked.length - 1]!;
    expect(Math.abs(above - below)).toBeLessThanOrEqual(6);
  });

  it('꾸미기는 256 정사각에 여백 안으로 비율을 지켜 그리고, 행을 뒤집어 아래 행부터 담는다', () => {
    const bitmap = raster(decoItem(), twoTone(100, 50));
    expect([bitmap.width, bitmap.height]).toEqual([DECO_CANVAS, DECO_CANVAS]);
    // 100×50 → 208×104를 가운데(세로 76~180)에. 위 절반 빨강, 아래 절반 파랑
    expect(fromTop(bitmap, 128, 90)).toEqual([255, 0, 0, 255]);
    expect(fromTop(bitmap, 128, 170)).toEqual([0, 0, 255, 255]);
    expect(fromTop(bitmap, 128, 60)[3]).toBe(0);
    // 데이터 첫 행(텍스처 v=0)은 그림의 맨 아래 행이다
    expect(pixelAt(bitmap.data, bitmap.width, 128, 255 - 90)).toEqual([255, 0, 0, 255]);
  });

  it('pencil 100은 글자를 회색으로 그린다', () => {
    const bitmap = raster(textItem({ effect: { type: 'pencil', intensity: 100 } }));
    let checked = 0;
    for (let i = 0; i < bitmap.data.length; i += 4) {
      if (bitmap.data[i + 3] !== 255) continue;
      checked++;
      expect(bitmap.data[i]).toBe(bitmap.data[i + 1]);
      expect(bitmap.data[i + 1]).toBe(bitmap.data[i + 2]);
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('drawing은 그림 둘레에 #2D2D2D 외곽선을 두른다', () => {
    const plain = raster(decoItem(), twoTone(100, 50));
    const drawn = raster(decoItem({ type: 'drawing', intensity: 100 }), twoTone(100, 50));
    // 그림 위쪽 가장자리(76) 바로 바깥 9px 안
    expect(fromTop(plain, 128, 70)[3]).toBe(0);
    expect(fromTop(drawn, 128, 70)).toEqual([45, 45, 45, 255]);
    expect(fromTop(drawn, 128, 60)[3]).toBe(0);
    expect(opaque(drawn)).toBeGreaterThan(opaque(plain));
  });

  it('꾸미기 이미지가 없으면 효과 없이 라벨을 적은 회색 상자를 그린다', () => {
    const bitmap = raster(decoItem({ type: 'soft', intensity: 100 }), null);
    expect(fromTop(bitmap, DECAL_PAD + 30, DECAL_PAD + 6)).toEqual([243, 244, 246, 255]);
    // 효과(그림자)를 걸지 않아 상자 밖은 비어 있다
    expect(fromTop(bitmap, 128, DECO_CANVAS - DECAL_PAD + 6)[3]).toBe(0);
    let label = 0;
    for (let i = 0; i < bitmap.data.length; i += 4)
      if (bitmap.data.slice(i, i + 4).join(',') === '107,114,128,255') label++;
    expect(label).toBeGreaterThan(20);
  });

  it(`폭 ${MAX_TEXTURE_WIDTH}px을 넘는 글자는 비율을 지켜 줄여 그린다`, () => {
    const item = textItem({ text: '가나다라마바사아자차카타파하가나다라마바사아자차카' });
    const pixels = decalPixelSize(item, measure);
    expect(pixels.width).toBeGreaterThan(MAX_TEXTURE_WIDTH);
    const bitmap = raster(item);
    expect(bitmap.width).toBe(MAX_TEXTURE_WIDTH);
    expect(bitmap.height).toBe(Math.round((pixels.height * MAX_TEXTURE_WIDTH) / pixels.width));
    expect(opaque(bitmap)).toBeGreaterThan(1000);
  });
});

describe('rasterizeDecal 실패', () => {
  afterEach(() => jest.restoreAllMocks());

  it('표면을 만들지 못하거나 픽셀을 읽지 못하면 던진다(화면은 캡처로 바꾼다)', () => {
    jest.spyOn(Skia.Surface, 'Make').mockReturnValueOnce(null);
    expect(() => raster(textItem())).toThrow('데칼 표면을 만들지 못했다');

    const make = Skia.Surface.Make.bind(Skia.Surface);
    jest.spyOn(Skia.Surface, 'Make').mockImplementationOnce((width, height) => {
      const surface = make(width, height)!;
      const snapshot = surface.makeImageSnapshot.bind(surface);
      surface.makeImageSnapshot = () => {
        const image = snapshot();
        image.readPixels = () => null;
        return image;
      };
      return surface;
    });
    expect(() => raster(textItem())).toThrow('데칼 픽셀을 읽지 못했다');
  });
});

describe('flipRows', () => {
  it('행 순서만 거꾸로 하고 행 안의 픽셀은 그대로 둔다', () => {
    const rows = Uint8Array.from([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
    ]);
    expect([...flipRows(rows, 2, 3)]).toEqual([
      17, 18, 19, 20, 21, 22, 23, 24, 9, 10, 11, 12, 13, 14, 15, 16, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });
});

describe('decalTexture', () => {
  it('구매자 CanvasTexture처럼 sRGB·밉맵·이방성 4로 표본을 뽑고 flipY는 쓰지 않는다', () => {
    const texture = decalTexture({ width: 2, height: 1, data: new Uint8Array(8) });
    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture).toMatchObject({
      colorSpace: THREE.SRGBColorSpace,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      anisotropy: 4,
      flipY: false,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    expect(texture.version).toBeGreaterThan(0);
  });
});
