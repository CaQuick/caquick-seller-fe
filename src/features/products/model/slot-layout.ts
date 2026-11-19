import { type CustomTextAlignType } from '@/graphql/generated/graphql';

/**
 * 슬롯 문구를 바탕 위에 그리는 규칙. 구매자 합성 이미지가 같은 규칙을 따라야 판매자 미리보기와 같은 모습이 된다.
 * 단위는 모두 바탕 한 변을 10000으로 본 값이고, 글꼴은 Pretendard 700(shared/lib/skia-text)이다.
 */
export const LINE_HEIGHT = 1.25;
const SIZE_STEP = 0.5;

/** fontSize(같은 단위)로 그린 한 줄의 폭 — 글꼴 엔진마다 달라 밖에서 넣는다 */
export type MeasureLine = (line: string, fontSize: number) => number;

export interface SlotBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SlotTextLayout {
  fontSize: number;
  lineHeight: number;
  /** x·y는 줄 상자의 왼쪽 위. 글자는 줄 상자 세로 가운데에 놓는다 */
  lines: { text: string; x: number; y: number; width: number }[];
}

/** 줄바꿈은 입력한 것만 쓴다(자동 줄바꿈 없음) */
export const slotLines = (text: string) => text.replace(/\r\n?/g, '\n').split('\n');

/** 모든 줄이 상자 폭 안에 들고 줄 수 × 줄 높이가 상자 높이 안에 드는 가장 큰 크기(0.5 단위). 없으면 0.5 */
export function fitFontSize(lines: readonly string[], box: SlotBox, measure: MeasureLine): number {
  const fits = (size: number) => lines.every((line) => measure(line, size) <= box.width);
  let lo = 1;
  let hi = Math.floor(box.height / (lines.length * LINE_HEIGHT) / SIZE_STEP);
  if (hi < lo || !fits(lo * SIZE_STEP)) return SIZE_STEP;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid * SIZE_STEP)) lo = mid;
    else hi = mid - 1;
  }
  return lo * SIZE_STEP;
}

const lineX = (align: CustomTextAlignType, box: SlotBox, width: number) => {
  if (align === 'LEFT') return box.x;
  if (align === 'RIGHT') return box.x + box.width - width;
  return box.x + (box.width - width) / 2;
};

/** 비운 문구(선택 슬롯의 '문구 없음')는 그리지 않는다 */
export function layoutSlotText(
  text: string | null,
  box: SlotBox,
  align: CustomTextAlignType,
  measure: MeasureLine,
): SlotTextLayout | null {
  if (!text) return null;
  const lines = slotLines(text);
  const fontSize = fitFontSize(lines, box, measure);
  const lineHeight = fontSize * LINE_HEIGHT;
  const top = box.y + (box.height - lines.length * lineHeight) / 2;
  return {
    fontSize,
    lineHeight,
    lines: lines.map((line, i) => {
      const width = measure(line, fontSize);
      return { text: line, x: lineX(align, box, width), y: top + i * lineHeight, width };
    }),
  };
}
