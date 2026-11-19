import { type DesignId, type DesignItem, parseThreeDDesign, type ShapeId } from './design-json';
import type { CakeFace } from './three/decal-geometry';

/** 이보다 항목이 많으면 그리지 않고 구매자 캡처를 보여 준다(서버 한도는 면마다 20개) */
export const MAX_ITEMS = 50;
/** 텍스처 상한. 최악(2048px 글자 40장)이 약 64MB라 저사양 기기의 GL 컨텍스트를 지킨다 */
export const MAX_TEXTURES = 40;

/** 그리는 데 쓰는 카탈로그 부분(퇴역 항목 포함) */
export interface RenderCatalog {
  optionChoices: readonly { category: string; value: string; renderScale?: number | null }[];
  sheetColors: readonly { key: string; hex: string }[];
  decos: readonly { key: string; label: string; imageUrl: string }[];
}

export interface DecalSpec {
  /** 같은 그림의 데칼은 텍스처 하나를 나눠 쓴다 */
  key: string;
  face: CakeFace;
  item: DesignItem;
  /** 꾸미기 이미지. 받지 못하면 label을 적은 상자로 대신한다 */
  deco: { imageUrl: string; label: string } | null;
}

export interface CakeRender {
  shape: ShapeId;
  design: DesignId | null;
  /** 시트 색(#RRGGBB) */
  color: string;
  /** 크기 배율(위에서 본 케이크 판) */
  scale: number;
  decals: DecalSpec[];
}

/**
 * unsupported·invalid는 디자인 파서와 같다. catalogMiss는 시트 색·크기·꾸미기 키가 카탈로그에 없는 경우(퇴역 항목도
 * 남으므로 캐시가 묵었거나 서버 문제), tooMany는 항목·텍스처 상한을 넘은 경우다
 */
export type RenderFailure = 'unsupported' | 'invalid' | 'catalogMiss' | 'tooMany';

export type CakeRenderResult =
  { ok: true; render: CakeRender } | { ok: false; reason: RenderFailure };

const rasterKey = (item: DesignItem) =>
  JSON.stringify(
    item.kind === 'TEXT'
      ? [item.kind, item.text, item.color, item.effect.type, item.effect.intensity]
      : [item.kind, item.decoId, item.effect.type, item.effect.intensity],
  );

/**
 * 주문의 threeDDesign을 카탈로그로 풀어 그릴 값으로 만든다. 시트 색·크기·꾸미기를 카탈로그에서 못 찾으면
 * 비슷한 값이나 대체 상자로 그리지 않고 catalogMiss로 돌려준다
 */
export function resolveCakeRender(raw: unknown, catalog: RenderCatalog): CakeRenderResult {
  const parsed = parseThreeDDesign(raw);
  if (!parsed.ok) return parsed;
  const { basic, top, side } = parsed.design;
  const color = catalog.sheetColors.find((c) => c.key === basic.sheetColor)?.hex;
  const scale = catalog.optionChoices.find(
    (c) => c.category === 'SIZE' && c.value === basic.size,
  )?.renderScale;
  if (!color || !scale) return { ok: false, reason: 'catalogMiss' };

  const decals: DecalSpec[] = [];
  for (const [face, items] of [
    ['top', top],
    ['side', side],
  ] as const)
    for (const item of items) {
      const deco =
        item.kind === 'DECO' ? catalog.decos.find((d) => d.key === item.decoId) : undefined;
      if (item.kind === 'DECO' && !deco) return { ok: false, reason: 'catalogMiss' };
      decals.push({
        key: rasterKey(item),
        face,
        item,
        deco: deco ? { imageUrl: deco.imageUrl, label: deco.label } : null,
      });
    }
  if (decals.length > MAX_ITEMS || new Set(decals.map((d) => d.key)).size > MAX_TEXTURES)
    return { ok: false, reason: 'tooMany' };
  return { ok: true, render: { shape: basic.shape, design: basic.design, color, scale, decals } };
}
