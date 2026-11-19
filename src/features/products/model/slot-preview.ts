import { type SkParagraph, type SkTypefaceFontProvider } from '@shopify/react-native-skia';

import { type CustomTextAlignType } from '@/graphql/generated/graphql';
import { textParagraph, textWidth } from '@/shared/lib/skia-text';

import { layoutSlotText, LINE_HEIGHT, type SlotBox } from './slot-layout';

export interface PreviewLine {
  paragraph: SkParagraph;
  /** 슬롯 상자 왼쪽 위 기준 px */
  x: number;
  y: number;
}

/**
 * 슬롯 렌더 규칙(layoutSlotText)대로 줄마다 Skia 문단을 만든다. 폭은 같은 글꼴로 크기마다 잰다.
 * scale은 바탕 한 변 10000 단위를 화면 px로 바꾸는 배율이고, 줄 높이 안에서 글자는 세로 가운데다
 */
export function slotPreviewLines(
  fonts: SkTypefaceFontProvider,
  text: string,
  box: SlotBox,
  align: CustomTextAlignType,
  color: string,
  scale: number,
): PreviewLine[] {
  const layout = layoutSlotText(text, box, align, (line, size) => textWidth(fonts, line, size));
  if (!layout) return [];
  return layout.lines.map((line) => ({
    paragraph: textParagraph(fonts, line.text, {
      size: layout.fontSize * scale,
      color,
      lineHeight: LINE_HEIGHT,
    }),
    x: (line.x - box.x) * scale,
    y: (line.y - box.y) * scale,
  }));
}
