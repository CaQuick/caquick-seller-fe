import {
  type SellerProductManageQuery,
  type SellerUpsertProductCustomTextTokenInput,
} from '@/graphql/generated/graphql';

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
  tokenKey: string;
  defaultText: string;
  maxLength: string;
  isRequired: boolean;
  rect: Rect;
}

export const TEMPLATE_COPY = {
  title: '커스텀 문구',
  save: '저장',
  saved: '저장되었습니다',
  useTitle: '커스텀 문구 사용',
  useDescription: '구매자가 주문할 때 문구를 입력해요',
  offGuide: '꺼져 있으면 구매자에게 문구 입력란이 보이지 않아요. 아래 슬롯 설정은 그대로 남아요',
  base: '베이스 이미지',
  baseHint: '박스를 끌어 위치와 크기를 정해요',
  changeImage: '이미지 변경',
  slots: '문구 슬롯',
  addSlot: '+ 슬롯 추가',
  needBase: '베이스 이미지를 먼저 올려 주세요',
} as const;

const DEFAULT_MAX_LENGTH = 20;
const MAX_TOKEN_KEY = 60;

/** 위치가 없는 슬롯은 위에서부터 겹치지 않게 놓는다 */
export function defaultRect(index: number): Rect {
  return { x: 1000, y: Math.min(1000 + index * 2000, SCALE - 1500), width: 8000, height: 1500 };
}

export function toSlots(tokens: readonly Token[]): Slot[] {
  return tokens.map((t, i) => ({
    key: t.id,
    id: t.id,
    tokenKey: t.tokenKey,
    defaultText: t.defaultText,
    maxLength: String(t.maxLength),
    isRequired: t.isRequired,
    rect:
      t.posX != null && t.posY != null && t.width != null && t.height != null
        ? { x: t.posX, y: t.posY, width: t.width, height: t.height }
        : defaultRect(i),
  }));
}

let seq = 0;
export function newSlot(index: number): Slot {
  return {
    key: `slot-${++seq}`,
    id: null,
    tokenKey: '',
    defaultText: '',
    maxLength: String(DEFAULT_MAX_LENGTH),
    isRequired: true,
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

export type SlotErrors = Partial<Record<'tokenKey' | 'defaultText' | 'maxLength', string>>;

export function slotErrors(slots: readonly Slot[]): Record<string, SlotErrors> {
  const result: Record<string, SlotErrors> = {};
  for (const slot of slots) {
    const errors: SlotErrors = {};
    if (!/^[a-z0-9]+$/.test(slot.tokenKey)) errors.tokenKey = '영문 소문자·숫자로 입력해 주세요';
    else if (slot.tokenKey.length > MAX_TOKEN_KEY)
      errors.tokenKey = `${MAX_TOKEN_KEY}자까지 입력할 수 있어요`;
    else if (slots.some((s) => s !== slot && s.tokenKey === slot.tokenKey))
      errors.tokenKey = '다른 슬롯과 겹치지 않게 입력해 주세요';
    if (!slot.defaultText.trim()) errors.defaultText = '기본 문구를 입력해 주세요';
    if (!(Number(slot.maxLength) >= 1)) errors.maxLength = '1자 이상으로 입력해 주세요';
    if (Object.keys(errors).length > 0) result[slot.key] = errors;
  }
  return result;
}

const sameRect = (a: Rect, b: Rect) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export function slotChanged(slot: Slot, saved: Slot | undefined): boolean {
  if (!saved) return true;
  return (
    slot.tokenKey !== saved.tokenKey ||
    slot.defaultText.trim() !== saved.defaultText.trim() ||
    slot.maxLength !== saved.maxLength ||
    slot.isRequired !== saved.isRequired ||
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
    defaultText: slot.defaultText.trim(),
    maxLength: Number(slot.maxLength),
    isRequired: slot.isRequired,
    sortOrder,
    posX: slot.rect.x,
    posY: slot.rect.y,
    width: slot.rect.width,
    height: slot.rect.height,
  };
}
