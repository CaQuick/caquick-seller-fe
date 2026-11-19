import { Canvas, Paragraph } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { colors } from '@/shared/config/tokens';
import { usePretendardFonts } from '@/shared/lib/skia-text';

import { slotPreviewLines } from '../model/slot-preview';
import {
  cleanText,
  isHexColor,
  moveRect,
  type Rect,
  resizeRect,
  SCALE,
  type Slot,
  toPx,
} from '../model/template-slots';

interface Props {
  slot: Slot;
  label: string;
  /** 베이스 이미지 한 변(px) */
  side: number;
  /** 이벤트마다 직전 값에 이동량을 더한다 — 다시 그리기 전에 이벤트가 겹쳐도 잃지 않게. 끄는 동안 제스처를 다시 만들지 않도록 안정된 함수여야 한다 */
  onRect: (key: string, update: (rect: Rect) => Rect) => void;
  onDragging: (dragging: boolean) => void;
}

/** 점선 두께. absolute 자식은 테두리 안쪽에 놓여 바깥 rect 상자에 맞추려면 이만큼 밀어낸다 */
const BORDER = 1.5;

/** .products-slot: 점선 박스를 끌면 이동, 오른쪽 아래 모서리를 끌면 크기 조절. 좌표는 비율로 저장한다 */
export function SlotBox({ slot, label, side, onRect, onDragging }: Props) {
  const { key } = slot;
  const { move, resize } = useMemo(() => {
    const pan = (id: string, apply: typeof moveRect) =>
      Gesture.Pan()
        .runOnJS(true)
        .withTestId(`${id}-${key}`)
        .onBegin(() => onDragging(true))
        // 활성화되기 전까지 움직인 거리는 onChange에 오지 않는다 — 시작 때 한 번 더한다
        .onStart((e) => onRect(key, (rect) => apply(rect, e.translationX, e.translationY, side)))
        .onChange((e) => onRect(key, (rect) => apply(rect, e.changeX, e.changeY, side)))
        .onFinalize(() => onDragging(false));
    const corner = pan('slot-resize', resizeRect);
    const body = pan('slot-move', moveRect);
    // 모서리를 잡으면 박스 이동은 시작하지 않는다
    corner.blocksExternalGesture(body);
    return { move: body, resize: corner };
  }, [key, side, onRect, onDragging]);

  return (
    <GestureDetector gesture={move}>
      <View
        accessibilityLabel={`${label} 위치`}
        style={{ ...toPx(slot.rect, side), borderWidth: BORDER }}
        className="absolute rounded-badge border-dashed border-primary"
      >
        <SlotTextPreview slot={slot} side={side} />
        <View
          style={{ left: -BORDER }}
          className="absolute -top-5 h-[18px] justify-center rounded-xs bg-primary px-1.5"
        >
          <Text numberOfLines={1} className="font-sans text-2xs font-semibold text-surface">
            {label}
          </Text>
        </View>
        <GestureDetector gesture={resize}>
          <View
            accessibilityLabel={`${label} 크기`}
            hitSlop={12}
            className="absolute -bottom-2 -right-2 h-4 w-4 rounded-xs border-[1.5px] border-primary bg-surface"
          />
        </GestureDetector>
      </View>
    </GestureDetector>
  );
}

/** 기본 문구를 슬롯 렌더 규칙대로 Skia로 그린다(구매자 합성 이미지와 같은 글꼴·측정). 글꼴을 읽는 동안은 비워 둔다 */
function SlotTextPreview({ slot, side }: { slot: Slot; side: number }) {
  const fonts = usePretendardFonts();
  const text = cleanText(slot.defaultText);
  const color = isHexColor(slot.textColor) ? slot.textColor : colors.slotTextDefault;
  const lines = useMemo(
    () =>
      fonts ? slotPreviewLines(fonts, text, slot.rect, slot.textAlign, color, side / SCALE) : [],
    [fonts, text, slot.rect, slot.textAlign, color, side],
  );
  return (
    <View
      testID={`slot-preview-${slot.key}`}
      pointerEvents="none"
      style={{ position: 'absolute', left: -BORDER, top: -BORDER, right: -BORDER, bottom: -BORDER }}
    >
      {lines.length > 0 ? (
        <Canvas style={{ flex: 1 }}>
          {/* 넓은 틀에 규칙의 x부터 그려 줄바꿈이 생기지 않게 한다 */}
          {lines.map((line, i) => (
            <Paragraph key={i} paragraph={line.paragraph} x={line.x} y={line.y} width={side * 2} />
          ))}
        </Canvas>
      ) : null}
    </View>
  );
}
