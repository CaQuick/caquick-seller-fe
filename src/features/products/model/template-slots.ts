import {
  type CustomTextAlignType,
  type SellerProductManageQuery,
  type SellerUpsertProductCustomTextTokenInput,
} from '@/graphql/generated/graphql';
import { colors } from '@/shared/config/tokens';

type Template = NonNullable<SellerProductManageQuery['sellerProduct']['customTemplate']>;
type Token = Template['textTokens'][number];

/** 좌표는 베이스 이미지 한 변을 SCALE로 본 정수 비율 — 구매자 화면 크기와 무관하게 같은 자리를 가리킨다 */
export const SCALE = 10_000;
/** 박스가 너무 작아 잡을 수 없게 되지 않게 */
const MIN_SIDE = 800;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Slot {
  /** 화면 key. 저장된 슬롯은 서버 id와 같다 */
  key: string;
  id: string | null;
  /** 내부 식별자. 새 자리는 slot{n}으로 만들고 저장된 키는 바꾸지 않는다 */
  tokenKey: string;
  /** 구매자 입력 화면에 보이는 이름 */
  label: string;
  defaultText: string;
  maxLength: string;
  isRequired: boolean;
  /** 입력 중에는 형식이 틀릴 수 있다 */
  textColor: string;
  textAlign: CustomTextAlignType;
  rect: Rect;
}

export const TEMPLATE_COPY = {
  title: '슬롯형 설정',
  save: '저장',
  saved: '저장되었습니다',
  base: '베이스 이미지',
  baseHint: '박스를 끌어 위치와 크기를 정해요',
  squareHint: '정사각형만 쓸 수 있어요. 고른 사진의 가운데를 잘라 올려요',
  changeImage: '이미지 변경',
  freeEdit: '자유 편집 허용',
  freeEditDescription:
    '구매자가 바탕 위에 영역을 그려 요청 문구와 참고 사진을 남겨요. 주문당 5건, 건당 사진 3장까지예요',
  slots: '문구 슬롯',
  addSlot: '+ 슬롯 추가',
  needBase: '베이스 이미지를 먼저 올려 주세요',
} as const;

const DEFAULT_MAX_LENGTH = 20;
const MAX_LENGTH = 50;
const MAX_LABEL = 30;
export const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

export const ALIGN_ITEMS = [
  { value: 'LEFT', label: '왼쪽' },
  { value: 'CENTER', label: '가운데' },
  { value: 'RIGHT', label: '오른쪽' },
] as const satisfies readonly { value: CustomTextAlignType; label: string }[];

/** 서버와 같은 기준: 코드 포인트 수(이모지 1자), 줄바꿈은 LF로 */
export const codePoints = (text: string) => [...text].length;
export const cleanText = (text: string) => text.replace(/\r\n?/g, '\n').trim();

/** 쓰지 않은 가장 작은 n의 slot{n} */
export function nextTokenKey(used: Iterable<string>): string {
  const taken = new Set(used);
  let n = 1;
  while (taken.has(`slot${n}`)) n += 1;
  return `slot${n}`;
}

/** 새 슬롯은 위에서부터 겹치지 않게 놓는다 */
export function defaultRect(index: number): Rect {
  return { x: 1000, y: Math.min(1000 + index * 2000, SCALE - 1500), width: 8000, height: 1500 };
}

export function toSlots(tokens: readonly Token[]): Slot[] {
  return tokens.map((t) => ({
    key: t.id,
    id: t.id,
    tokenKey: t.tokenKey,
    label: t.label,
    defaultText: t.defaultText,
    maxLength: String(t.maxLength),
    isRequired: t.isRequired,
    textColor: t.textColor,
    textAlign: t.textAlign,
    rect: { x: t.posX, y: t.posY, width: t.width, height: t.height },
  }));
}

let seq = 0;
/** usedKeys에는 이번 편집에서 지운 자리의 키도 넣는다 — 같은 저장에서 지운 자리를 되살리지 않게 */
export function newSlot(index: number, usedKeys: Iterable<string>): Slot {
  return {
    key: `new-${++seq}`,
    id: null,
    tokenKey: nextTokenKey(usedKeys),
    label: '',
    defaultText: '',
    maxLength: String(DEFAULT_MAX_LENGTH),
    isRequired: true,
    // 서버가 새 자리에 두는 기본색과 같다
    textColor: colors.ink,
    textAlign: 'CENTER',
    rect: defaultRect(index),
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** 픽셀 이동량을 비율로 바꿔 이미지 밖으로 나가지 않게 옮긴다 */
export function moveRect(rect: Rect, dx: number, dy: number, side: number): Rect {
  return {
    ...rect,
    x: clamp(Math.round(rect.x + (dx / side) * SCALE), 0, SCALE - rect.width),
    y: clamp(Math.round(rect.y + (dy / side) * SCALE), 0, SCALE - rect.height),
  };
}

/** 오른쪽 아래 모서리를 끌어 크기를 바꾼다. 왼쪽 위는 고정 */
export function resizeRect(rect: Rect, dx: number, dy: number, side: number): Rect {
  return {
    ...rect,
    width: clamp(Math.round(rect.width + (dx / side) * SCALE), MIN_SIDE, SCALE - rect.x),
    height: clamp(Math.round(rect.height + (dy / side) * SCALE), MIN_SIDE, SCALE - rect.y),
  };
}

export const toPx = (rect: Rect, side: number) => ({
  left: (rect.x / SCALE) * side,
  top: (rect.y / SCALE) * side,
  width: (rect.width / SCALE) * side,
  height: (rect.height / SCALE) * side,
});

export type SlotErrors = Partial<
  Record<'label' | 'defaultText' | 'maxLength' | 'textColor', string>
>;

export function slotErrors(slots: readonly Slot[]): Record<string, SlotErrors> {
  const result: Record<string, SlotErrors> = {};
  for (const slot of slots) {
    const errors: SlotErrors = {};
    const label = slot.label.trim();
    if (!label) errors.label = '표시 이름을 입력해 주세요';
    else if (codePoints(label) > MAX_LABEL) errors.label = `${MAX_LABEL}자까지 입력할 수 있어요`;
    const max = Number(slot.maxLength);
    const maxValid = max >= 1 && max <= MAX_LENGTH;
    if (!maxValid) errors.maxLength = `1~${MAX_LENGTH}자로 입력해 주세요`;
    const text = cleanText(slot.defaultText);
    if (!text) errors.defaultText = '기본 문구를 입력해 주세요';
    else if (maxValid && codePoints(text) > max)
      errors.defaultText = `최대 글자 수(${max}자)보다 길어요`;
    if (!isHexColor(slot.textColor)) errors.textColor = '#RRGGBB 형식으로 입력해 주세요';
    if (Object.keys(errors).length > 0) result[slot.key] = errors;
  }
  return result;
}

const sameRect = (a: Rect, b: Rect) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export function slotChanged(slot: Slot, saved: Slot | undefined): boolean {
  if (!saved) return true;
  return (
    slot.label.trim() !== saved.label.trim() ||
    cleanText(slot.defaultText) !== cleanText(saved.defaultText) ||
    slot.maxLength !== saved.maxLength ||
    slot.isRequired !== saved.isRequired ||
    slot.textColor.toUpperCase() !== saved.textColor.toUpperCase() ||
    slot.textAlign !== saved.textAlign ||
    !sameRect(slot.rect, saved.rect)
  );
}

export function toTokenInput(
  slot: Slot,
  templateId: string,
  sortOrder: number,
): SellerUpsertProductCustomTextTokenInput {
  return {
    tokenId: slot.id ?? undefined,
    templateId,
    tokenKey: slot.tokenKey,
    label: slot.label.trim(),
    defaultText: cleanText(slot.defaultText),
    maxLength: Number(slot.maxLength),
    isRequired: slot.isRequired,
    sortOrder,
    posX: slot.rect.x,
    posY: slot.rect.y,
    width: slot.rect.width,
    height: slot.rect.height,
    textColor: slot.textColor.toUpperCase(),
    textAlign: slot.textAlign,
  };
}
