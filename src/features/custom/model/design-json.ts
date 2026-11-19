import { z } from 'zod';

/** 이 앱이 그릴 수 있는 디자인 JSON 버전(BE designSchemaVersion) */
const DESIGN_SCHEMA_VERSION = 1;

// 형상 코드가 있는 값만 둔다. 카탈로그에 새 값이 생기면 이 앱은 그리지 못하고 캡처로 보여 준다.
const SHAPE_IDS = [
  'heart',
  'circle',
  'square',
  'star',
  'triangle',
  'bear',
  'clover',
  'flower',
] as const;
/** phrase는 옆면 장식 없이 문구 항목만 올라간다 */
const DESIGN_IDS = ['wave', 'drip', 'phrase', 'heart', 'sparkle'] as const;
const EFFECT_IDS = ['none', 'soft', 'drawing', 'pencil'] as const;

export type ShapeId = (typeof SHAPE_IDS)[number];
export type DesignId = (typeof DESIGN_IDS)[number];
type EffectId = (typeof EFFECT_IDS)[number];

interface DesignEffect {
  type: EffectId;
  /** 0~100 정수 */
  intensity: number;
}

interface DesignItemBase {
  /** 윗면은 케이크 판 정사각 기준 중심(왼쪽 위 원점), 옆면은 정면에서 잰 둘레 비율 x와 윗면 0~바닥 1의 y */
  x: number;
  y: number;
  /** 케이크 판 너비 대비 cqw(글자는 글자 크기, 꾸미기는 한 변) */
  size: number;
  effect: DesignEffect;
}

export type DesignItem =
  | (DesignItemBase & { kind: 'TEXT'; text: string; color: string })
  | (DesignItemBase & { kind: 'DECO'; decoId: string });

export interface CakeDesign {
  basic: {
    shape: ShapeId;
    /** 크기·시트 색 key는 카탈로그에서 배율·색을 찾는다 */
    size: string;
    /** null이면 장식 없는 시트 */
    design: DesignId | null;
    flavor: string | null;
    sheetColor: string;
  };
  /** 배열 순서가 그리는 순서 */
  top: DesignItem[];
  side: DesignItem[];
}

/** unsupported: 이 앱이 모르는 버전·값(앱을 업데이트하면 볼 수 있다), invalid: 저장값이 깨짐 */
type Failure = 'unsupported' | 'invalid';

export type DesignParseResult = { ok: true; design: CakeDesign } | { ok: false; reason: Failure };

const versionSchema = z.object({ schemaVersion: z.number() });

const unit = z.number().min(0).max(1);
// 열거 값은 문자열로 받고 아래에서 가린다(모르는 값은 unsupported, 모양이 깨진 값은 invalid)
const itemSchema = z.object({
  kind: z.string(),
  x: unit,
  y: unit,
  size: z.number().positive(),
  effect: z.object({ type: z.string(), intensity: z.number().int().min(0).max(100) }),
  text: z.string().nullish(),
  color: z.string().nullish(),
  decoId: z.string().nullish(),
});

const designSchema = z.object({
  basic: z.object({
    shape: z.string(),
    size: z.string(),
    design: z.string().nullable(),
    flavor: z.string().nullable(),
    sheetColor: z.string(),
  }),
  top: z.array(itemSchema),
  side: z.array(itemSchema),
});

const COLOR = /^#[0-9a-f]{6}$/i;

const known = <T extends string>(values: readonly T[], value: string): value is T =>
  (values as readonly string[]).includes(value);

function toItem(raw: z.infer<typeof itemSchema>): DesignItem | Failure {
  const { type, intensity } = raw.effect;
  if (!known(EFFECT_IDS, type)) return 'unsupported';
  const base = { x: raw.x, y: raw.y, size: raw.size, effect: { type, intensity } };
  switch (raw.kind) {
    case 'TEXT':
      return raw.text && raw.color && COLOR.test(raw.color)
        ? { ...base, kind: 'TEXT', text: raw.text, color: raw.color.toUpperCase() }
        : 'invalid';
    case 'DECO':
      return raw.decoId ? { ...base, kind: 'DECO', decoId: raw.decoId } : 'invalid';
    default:
      return 'unsupported';
  }
}

function toItems(raws: z.infer<typeof itemSchema>[]): DesignItem[] | Failure {
  const items: DesignItem[] = [];
  for (const raw of raws) {
    const item = toItem(raw);
    if (typeof item === 'string') return item;
    items.push(item);
  }
  return items;
}

/**
 * 주문의 threeDDesign을 렌더 입력으로 바꾼다. 그릴 수 없으면 이유만 돌려주고 화면은 구매자 캡처로 대신한다.
 * 모르는 값을 다른 값으로 바꿔 그리지 않는다(판매자가 보고 만드는 그림이 구매자 화면과 달라진다).
 */
export function parseThreeDDesign(raw: unknown): DesignParseResult {
  const version = versionSchema.safeParse(raw);
  if (!version.success) return { ok: false, reason: 'invalid' };
  if (version.data.schemaVersion !== DESIGN_SCHEMA_VERSION)
    return { ok: false, reason: 'unsupported' };

  const parsed = designSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: 'invalid' };
  const { basic } = parsed.data;
  const { shape, design } = basic;
  if (!known(SHAPE_IDS, shape) || (design !== null && !known(DESIGN_IDS, design)))
    return { ok: false, reason: 'unsupported' };
  const top = toItems(parsed.data.top);
  if (typeof top === 'string') return { ok: false, reason: top };
  const side = toItems(parsed.data.side);
  if (typeof side === 'string') return { ok: false, reason: side };
  return { ok: true, design: { basic: { ...basic, shape, design }, top, side } };
}
