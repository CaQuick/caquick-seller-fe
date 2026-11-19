import {
  fitFontSize,
  LINE_HEIGHT,
  layoutSlotText,
  type MeasureLine,
  slotLines,
} from './slot-layout';

/** 글자 하나가 0.5em인 가짜 글꼴 — 폭은 코드 포인트 수 × 크기 / 2 */
const measure: MeasureLine = (line, size) => ([...line].length * size) / 2;
const BOX = { x: 1000, y: 2000, width: 8000, height: 1500 };

describe('slotLines', () => {
  it.each<[string, string[]]>([
    ['한 줄', ['한 줄']],
    ['위\n아래', ['위', '아래']],
    ['윈도\r\n줄바꿈\r옛 맥', ['윈도', '줄바꿈', '옛 맥']],
    ['끝 줄바꿈\n', ['끝 줄바꿈', '']],
  ])('%j → 입력한 줄바꿈만 쓴다', (text, lines) => {
    expect(slotLines(text)).toEqual(lines);
  });
});

describe('fitFontSize', () => {
  it.each<[string, string[], { width: number; height: number }, number]>([
    ['높이가 정한다', ['abcd'], { width: 8000, height: 1500 }, 1200],
    ['폭이 정한다', ['abcdefghij'], { width: 4000, height: 1500 }, 800],
    ['0.5 단위로 내린다', ['abcdefg'], { width: 4000, height: 1500 }, 1142.5],
    ['줄 수만큼 높이를 나눈다', ['ab', 'cdef'], { width: 8000, height: 1500 }, 600],
    ['가장 긴 줄이 폭을 정한다', ['a', 'abcdefghij'], { width: 4000, height: 8000 }, 800],
    ['이모지는 한 글자', ['🎂🎂'], { width: 1000, height: 5000 }, 1000],
    ['맞는 크기가 없으면 0.5', ['abcdefghij'], { width: 1, height: 1500 }, 0.5],
    ['높이가 0.5보다 작아도 0.5', ['a'], { width: 8000, height: 0.5 }, 0.5],
  ])('%s', (_, lines, size, expected) => {
    expect(fitFontSize(lines, { x: 0, y: 0, ...size }, measure)).toBe(expected);
  });

  it.each([
    [3, 997, 1499],
    [5, 4321, 777],
    [9, 10_000, 10_000],
    [1, 13, 9999],
    [12, 2500, 333],
  ])('이진 탐색이 0.5씩 올려 본 결과와 같다(%d자, %d×%d)', (chars, width, height) => {
    const lines = ['a'.repeat(chars), 'b'];
    let linear = 0.5;
    for (let size = 0.5; size * LINE_HEIGHT * lines.length <= height; size += 0.5) {
      if (lines.every((l) => measure(l, size) <= width)) linear = size;
    }
    expect(fitFontSize(lines, { x: 0, y: 0, width, height }, measure)).toBe(linear);
  });
});

describe('layoutSlotText', () => {
  it.each([null, ''])('비운 문구(%j)는 그리지 않는다', (text) => {
    expect(layoutSlotText(text, BOX, 'CENTER', measure)).toBeNull();
  });

  it('줄 묶음을 상자 세로 가운데에 놓는다', () => {
    expect(layoutSlotText('abcdefghij', { ...BOX, width: 4000 }, 'CENTER', measure)).toEqual({
      fontSize: 800,
      lineHeight: 1000,
      lines: [{ text: 'abcdefghij', x: 1000, y: 2250, width: 4000 }],
    });
  });

  it.each<['LEFT' | 'CENTER' | 'RIGHT', number[]]>([
    ['LEFT', [1000, 1000]],
    ['CENTER', [4700, 4400]],
    ['RIGHT', [8400, 7800]],
  ])('%s 정렬은 줄마다 가로 자리를 정한다', (align, xs) => {
    const layout = layoutSlotText('ab\ncdef', BOX, align, measure)!;
    expect(layout.fontSize).toBe(600);
    expect(layout.lines.map((l) => [l.x, l.y, l.width])).toEqual([
      [xs[0], 2000, 600],
      [xs[1], 2750, 1200],
    ]);
  });

  it('모르는 정렬 값은 가운데로 그린다', () => {
    const layout = layoutSlotText('ab', BOX, 'JUSTIFY' as 'CENTER', measure)!;
    expect(layout.lines[0]!.x).toBe(1000 + (8000 - layout.lines[0]!.width) / 2);
  });
});
