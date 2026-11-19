import {
  AlphaType,
  ColorType,
  FilterMode,
  MipmapMode,
  Skia,
  type SkCanvas,
  type SkImage,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import * as THREE from 'three';

import { renderColors } from '@/shared/config/tokens';
import { textParagraph } from '@/shared/lib/skia-text';

import { type DesignItem } from '../design-json';
import {
  DECAL_PAD,
  type DecalPixels,
  decalLabel,
  DECO_CANVAS,
  TEXT_FONT_PX,
} from '../three/decal-geometry';
import { effectImageFilter } from './effect-filter';

/** 텍스처 폭 상한(px). 넘으면 비율을 지켜 줄여 그린다. 붙이는 판의 크기는 그대로다 */
export const MAX_TEXTURE_WIDTH = 2048;
const FALLBACK_RADIUS = 24;
const FALLBACK_FONT_PX = 28;

export interface DecalAssets {
  fonts: SkTypefaceFontProvider;
  /** 꾸미기 이미지. 없으면 label을 적은 회색 상자로 대신한다 */
  image?: SkImage | null;
  label?: string;
}

export interface DecalBitmap {
  width: number;
  height: number;
  /** RGBA(알파를 곱하지 않은 값), GL 텍스처처럼 아래 행부터 */
  data: Uint8Array;
}

/** 위 행부터인 RGBA를 아래 행부터로(DataTexture는 flipY를 쓰지 않는다) */
export function flipRows(data: Uint8Array, width: number, height: number): Uint8Array {
  const stride = width * 4;
  const flipped = new Uint8Array(data.length);
  for (let row = 0; row < height; row++)
    flipped.set(data.subarray(row * stride, (row + 1) * stride), (height - 1 - row) * stride);
  return flipped;
}

function drawFallback(canvas: SkCanvas, assets: DecalAssets) {
  const inner = DECO_CANVAS - DECAL_PAD * 2;
  const box = Skia.Paint();
  box.setColor(Skia.Color(renderColors.decoFallback));
  canvas.drawRRect(
    Skia.RRectXY(
      Skia.XYWHRect(DECAL_PAD, DECAL_PAD, inner, inner),
      FALLBACK_RADIUS,
      FALLBACK_RADIUS,
    ),
    box,
  );
  const label = textParagraph(assets.fonts, assets.label ?? '', {
    size: FALLBACK_FONT_PX,
    color: renderColors.decoFallbackText,
  });
  label.paint(
    canvas,
    (DECO_CANVAS - label.getMaxIntrinsicWidth()) / 2,
    (DECO_CANVAS - label.getHeight()) / 2,
  );
}

/**
 * 구매자 편집기 ItemDecal의 캔버스 그림을 Skia 오프스크린에 그린다.
 * 글자는 가운데 맞춤 한 줄(textBaseline middle), 꾸미기는 여백 안에 비율을 지켜 가운데. 효과는 그린 결과 전체에 건다
 */
export function rasterizeDecal(
  item: DesignItem,
  pixels: DecalPixels,
  assets: DecalAssets,
): DecalBitmap {
  const scale = Math.min(1, MAX_TEXTURE_WIDTH / pixels.width);
  const width = Math.max(1, Math.round(pixels.width * scale));
  const height = Math.max(1, Math.round(pixels.height * scale));
  const surface = Skia.Surface.Make(width, height);
  if (!surface) throw new Error(`데칼 표면을 만들지 못했다 (${width}×${height})`);
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);

  const layer = Skia.Paint();
  const filter = effectImageFilter(item.effect);
  if (filter) layer.setImageFilter(filter);

  if (item.kind === 'TEXT') {
    const text = textParagraph(assets.fonts, decalLabel(item.text), {
      size: TEXT_FONT_PX,
      color: item.color,
    });
    canvas.saveLayer(layer);
    text.paint(
      canvas,
      (pixels.width - text.getMaxIntrinsicWidth()) / 2,
      (pixels.height - text.getHeight()) / 2,
    );
    canvas.restore();
  } else if (assets.image) {
    const { image } = assets;
    const inner = DECO_CANVAS - DECAL_PAD * 2;
    const ratio = Math.min(inner / image.width(), inner / image.height());
    const w = image.width() * ratio;
    const h = image.height() * ratio;
    canvas.saveLayer(layer);
    canvas.drawImageRectOptions(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect((DECO_CANVAS - w) / 2, (DECO_CANVAS - h) / 2, w, h),
      FilterMode.Linear,
      MipmapMode.None,
    );
    canvas.restore();
  } else {
    // 구매자 편집기처럼 대체 상자에는 효과를 걸지 않는다
    drawFallback(canvas, assets);
  }

  surface.flush();
  const rgba = surface.makeImageSnapshot().readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (!(rgba instanceof Uint8Array)) throw new Error('데칼 픽셀을 읽지 못했다');
  return { width, height, data: flipRows(rgba, width, height) };
}

/** 구매자 CanvasTexture와 같은 표본 추출(sRGB, 밉맵, 이방성 4) */
export function decalTexture({ width, height, data }: DecalBitmap): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
