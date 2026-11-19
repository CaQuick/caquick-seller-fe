import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Skia, type SkTypefaceFontProvider } from '@shopify/react-native-skia';

import { fontFamily } from '@/shared/config/tokens';

/** 앱이 번들하는 Pretendard 700을 등록한 글꼴 공급자(skia-environment 전용) */
export function pretendardFonts(): SkTypefaceFontProvider {
  const bytes = readFileSync(join(__dirname, '../../assets/fonts/Pretendard-Bold.otf'));
  const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
    Skia.Data.fromBytes(new Uint8Array(bytes)),
  );
  if (!typeface) throw new Error('Pretendard를 읽지 못했다');
  const fonts = Skia.TypefaceFontProvider.Make();
  fonts.registerFont(typeface, fontFamily);
  return fonts;
}

/** RGBA 바이트에서 (x, y) 픽셀. y는 위에서부터 */
export const pixelAt = (data: Uint8Array, width: number, x: number, y: number) =>
  Array.from(data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4));
