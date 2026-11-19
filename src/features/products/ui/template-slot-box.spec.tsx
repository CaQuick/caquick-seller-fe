/**
 * @jest-environment ./src/test/skia-environment.js
 */
import { AlphaType, ColorType, Skia, type SkParagraph } from '@shopify/react-native-skia';
import { render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { textWidth } from '@/shared/lib/skia-text';
import { pretendardFonts } from '@/test/skia';

import { layoutSlotText } from '../model/slot-layout';
import { type Slot } from '../model/template-slots';
import { SlotBox } from './template-slot-box';

jest.mock('@/shared/lib/skia-text', () => {
  const actual = jest.requireActual<object>('@/shared/lib/skia-text');
  const { pretendardFonts: load } = jest.requireActual<{ pretendardFonts: () => unknown }>(
    '@/test/skia',
  );
  const fonts = load();
  return { ...actual, usePretendardFonts: () => fonts };
});

const SIDE = 285;
const slot = (patch: Partial<Slot> = {}): Slot => ({
  key: 'k1',
  id: 'k1',
  tokenKey: 'slot1',
  label: '이름',
  defaultText: '생일\n축하해',
  maxLength: '20',
  isRequired: true,
  textColor: '#1D1D1D',
  textAlign: 'RIGHT',
  rect: { x: 1000, y: 2000, width: 4000, height: 1000 },
  ...patch,
});

/** 미리보기 층 안 Skia 문단의 위치·폭 */
async function paragraphs(value: Slot) {
  await render(
    <GestureHandlerRootView>
      <SlotBox slot={value} label="이름" side={SIDE} onRect={jest.fn()} onDragging={jest.fn()} />
    </GestureHandlerRootView>,
  );
  const layer = screen.getByTestId('slot-preview-k1');
  const canvas = layer.children[0];
  if (!canvas || typeof canvas === 'string') return [];
  return canvas.children.map((node) => {
    if (typeof node === 'string') throw new Error('문단이 아니다');
    const { x, y, width } = node.props as { x: number; y: number; width: number };
    return { type: node.type, x, y, width, paragraph: node.props.paragraph as SkParagraph };
  });
}

describe('SlotBox 미리보기(Skia)', () => {
  it('기본 문구를 Pretendard로 잰 슬롯 규칙대로 줄마다 그린다', async () => {
    const fonts = pretendardFonts();
    const layout = layoutSlotText(slot().defaultText, slot().rect, 'RIGHT', (line, size) =>
      textWidth(fonts, line, size),
    )!;
    const k = SIDE / 10000;
    expect(await paragraphs(slot())).toEqual(
      layout.lines.map((line) => ({
        type: 'skParagraph',
        paragraph: expect.anything() as unknown,
        x: expect.closeTo((line.x - 1000) * k, 6) as number,
        y: expect.closeTo((line.y - 2000) * k, 6) as number,
        // 넓은 틀에 그려 줄바꿈이 생기지 않는다
        width: SIDE * 2,
      })),
    );
  });

  /** 문단을 그려 가장 진한 글자 픽셀의 색 */
  function inkColor(paragraph: SkParagraph) {
    const surface = Skia.Surface.Make(200, 60)!;
    paragraph.paint(surface.getCanvas(), 0, 0);
    const info = {
      width: 200,
      height: 60,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    };
    const data = surface.makeImageSnapshot().readPixels(0, 0, info) as Uint8Array;
    for (let i = 0; i < data.length; i += 4)
      if (data[i + 3] === 255) return [...data.subarray(i, i + 3)];
    return null;
  }

  it('글자색은 슬롯 색이고, 색 코드가 틀린 동안은 기본 글자색(검정)으로 그린다', async () => {
    const [red] = await paragraphs(slot({ textColor: '#E5484D', defaultText: '가' }));
    expect(inkColor(red!.paragraph)).toEqual([229, 72, 77]);
    const [typing] = await paragraphs(slot({ textColor: '#12', defaultText: '가' }));
    expect(inkColor(typing!.paragraph)).toEqual([0, 0, 0]);
  });

  it('비운 문구는 그리지 않는다', async () => {
    expect(await paragraphs(slot({ defaultText: '  ' }))).toEqual([]);
  });
});
