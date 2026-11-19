import {
  Skia,
  type SkParagraph,
  type SkTypefaceFontProvider,
  useFonts,
} from '@shopify/react-native-skia';

import { fontFamily } from '@/shared/config/tokens';

import pretendardBold from '../../../assets/fonts/Pretendard-Bold.otf';

/** 슬롯 문구·3D 글자가 같이 쓰는 글꼴(Pretendard 700)을 Skia에 올린다. 읽는 동안 null */
export const usePretendardFonts = () => useFonts({ [fontFamily]: [pretendardBold] });

export interface TextStyle {
  size: number;
  color: string;
  /** 줄 높이(em). 남는 높이는 글자 위아래에 반씩 둔다 */
  lineHeight?: number;
}

/** 한 줄 문단. 등록한 글꼴에 없는 글자(이모지 등)는 기기 기본 글꼴로 그린다 */
export function textParagraph(
  fonts: SkTypefaceFontProvider,
  text: string,
  { size, color, lineHeight }: TextStyle,
): SkParagraph {
  const paragraph = Skia.ParagraphBuilder.Make({}, fonts)
    .pushStyle({
      fontFamilies: [fontFamily],
      fontSize: size,
      fontStyle: { weight: 700 },
      color: Skia.Color(color),
      ...(lineHeight ? { heightMultiplier: lineHeight, halfLeading: true } : {}),
    })
    .addText(text)
    .build();
  // 줄바꿈 없이 한 줄로 잰다
  paragraph.layout(1e6);
  return paragraph;
}

/** 글자들의 진행 폭 합(Canvas 2D measureText와 같은 기준) */
export const textWidth = (fonts: SkTypefaceFontProvider, text: string, size: number) =>
  textParagraph(fonts, text, { size, color: 'black' }).getMaxIntrinsicWidth();
