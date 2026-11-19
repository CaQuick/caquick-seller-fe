/**
 * @jest-environment ./src/test/skia-environment.js
 */
import { textWidth } from '@/shared/lib/skia-text';
import { pretendardFonts } from '@/test/skia';

import { layoutSlotText } from './slot-layout';
import { slotPreviewLines } from './slot-preview';

const fonts = pretendardFonts();
const BOX = { x: 1000, y: 2000, width: 4000, height: 1000 };

describe('slotPreviewLines', () => {
  it('Skia로 잰 폭으로 규칙대로 크기를 정하고, 줄마다 상자 기준 px 위치에 문단을 둔다', () => {
    const scale = 285 / 10000;
    const lines = slotPreviewLines(fonts, '생일\n축하해', BOX, 'CENTER', '#1D1D1D', scale);
    const layout = layoutSlotText('생일\n축하해', BOX, 'CENTER', (line, size) =>
      textWidth(fonts, line, size),
    )!;
    expect(lines).toHaveLength(2);
    lines.forEach((line, i) => {
      expect(line.x).toBeCloseTo((layout.lines[i]!.x - BOX.x) * scale, 9);
      expect(line.y).toBeCloseTo((layout.lines[i]!.y - BOX.y) * scale, 9);
      // 줄 높이 1.25em 문단(Skia가 줄 높이를 정수로 반올림한다), 폭은 화면 크기로 다시 잰 값과 같다
      expect(
        Math.abs(line.paragraph.getHeight() - layout.fontSize * scale * 1.25),
      ).toBeLessThanOrEqual(0.5);
      expect(line.paragraph.getMaxIntrinsicWidth()).toBeCloseTo(layout.lines[i]!.width * scale, 0);
    });
    // 가운데 정렬: 짧은 첫 줄이 더 오른쪽에서 시작한다
    expect(lines[0]!.x).toBeGreaterThan(lines[1]!.x);
    // 두 줄이 상자 높이를 넘지 않는 최대 크기라 세로로 상자를 채운다
    expect(lines[1]!.y + lines[1]!.paragraph.getHeight()).toBeLessThanOrEqual(
      BOX.height * scale + 0.5,
    );
  });

  it('비운 문구는 그리지 않는다', () => {
    expect(slotPreviewLines(fonts, '', BOX, 'LEFT', '#000000', 1)).toEqual([]);
  });
});
