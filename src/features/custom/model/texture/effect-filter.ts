import { Skia, type SkImageFilter } from '@shopify/react-native-skia';

import { renderColors } from '@/shared/config/tokens';

import { type DesignItem } from '../design-json';

/** 구매자 편집기의 CSS filter 값(px)을 텍스처 해상도에 맞게 키우는 배율 */
export const EFFECT_SCALE = 3;

type Effect = DesignItem['effect'];

/** 구매자 CSS 문자열의 toFixed 반올림을 그대로 따른다 */
const fixed = (value: number, digits: number) => Number(value.toFixed(digits));

/** CSS 필터 명세의 grayscale(amount) 색 행렬 */
function grayscale(amount: number) {
  const k = 1 - amount;
  // prettier-ignore
  return [
    0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k, 0, 0,
    0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k, 0, 0,
    0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** contrast(amount): 채널마다 기울기 amount, 0.5를 축으로(이동 값은 0~1 단위) */
function contrast(amount: number) {
  const shift = 0.5 - 0.5 * amount;
  // prettier-ignore
  return [
    amount, 0, 0, 0, shift,
    0, amount, 0, 0, shift,
    0, 0, amount, 0, shift,
    0, 0, 0, 1, 0,
  ];
}

/** 구매자 effectFilter가 만드는 CSS 값(px은 EFFECT_SCALE배). 효과가 없으면 null */
export type EffectParams =
  | { type: 'soft'; dy: number; blur: number; alpha: number }
  | { type: 'drawing'; width: number }
  | { type: 'pencil'; grayscale: number; contrast: number };

export function effectParams({ type, intensity }: Effect): EffectParams | null {
  const t = intensity / 100;
  switch (type) {
    case 'soft':
      return {
        type,
        dy: fixed(1 + 3 * t, 1) * EFFECT_SCALE,
        blur: fixed(2 + 8 * t, 1) * EFFECT_SCALE,
        alpha: fixed(0.15 + 0.35 * t, 2),
      };
    case 'drawing':
      return { type, width: fixed(0.5 + 2.5 * t, 1) * EFFECT_SCALE };
    case 'pencil':
      return { type, grayscale: fixed(t, 2), contrast: fixed(1 + 0.3 * t, 2) };
    default:
      return null;
  }
}

/**
 * 효과를 Skia 이미지 필터로. CSS처럼 함수 여러 개는 앞 결과에 차례로 건다(그림자의 그림자까지).
 * drop-shadow의 blur 길이는 Chrome canvas가 가우스 표준편차로 그대로 쓴다(blur/2로 그리면 그림자가 좁아진다)
 */
export function effectImageFilter(effect: Effect): SkImageFilter | null {
  const params = effectParams(effect);
  switch (params?.type) {
    case 'soft':
      return Skia.ImageFilter.MakeDropShadow(
        0,
        params.dy,
        params.blur,
        params.blur,
        Skia.Color(`rgba(0,0,0,${params.alpha})`),
        null,
      );
    case 'drawing': {
      const { width: w } = params;
      const outline = Skia.Color(renderColors.outline);
      return [
        [w, 0],
        [-w, 0],
        [0, w],
        [0, -w],
      ].reduce<SkImageFilter | null>(
        (input, [dx, dy]) => Skia.ImageFilter.MakeDropShadow(dx!, dy!, 0, 0, outline, input),
        null,
      );
    }
    case 'pencil':
      return Skia.ImageFilter.MakeColorFilter(
        Skia.ColorFilter.MakeCompose(
          Skia.ColorFilter.MakeMatrix(contrast(params.contrast)),
          Skia.ColorFilter.MakeMatrix(grayscale(params.grayscale)),
        ),
        null,
      );
    default:
      return null;
  }
}
