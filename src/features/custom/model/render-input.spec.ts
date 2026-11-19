import { MAX_ITEMS, MAX_TEXTURES, type RenderCatalog, resolveCakeRender } from './render-input';

const CATALOG: RenderCatalog = {
  optionChoices: [
    { category: 'SIZE', value: 'mini', renderScale: 0.82 },
    { category: 'SHAPE', value: 'heart', renderScale: null },
    { category: 'SIZE', value: 'old', renderScale: null },
  ],
  sheetColors: [{ key: 'pink', hex: '#FFC2CF' }],
  decos: [{ key: 'number-1', label: '1', imageUrl: 'https://cdn/number-1.png' }],
};

const effect = { type: 'none', intensity: 0 };
const text = (value: string, color = '#1d1d1d') => ({
  kind: 'TEXT',
  x: 0.5,
  y: 0.5,
  size: 10,
  effect,
  text: value,
  color,
  decoId: null,
});
const deco = (decoId: string) => ({
  kind: 'DECO',
  x: 0.2,
  y: 0.8,
  size: 20,
  effect,
  text: null,
  color: null,
  decoId,
});
const design = (
  patch: Record<string, unknown> = {},
  top: unknown[] = [],
  side: unknown[] = [],
) => ({
  schemaVersion: 1,
  basic: {
    shape: 'heart',
    size: 'mini',
    design: 'drip',
    flavor: null,
    sheetColor: 'pink',
    ...patch,
  },
  top,
  side,
});

describe('resolveCakeRender', () => {
  it('시트 색·크기 배율을 카탈로그에서 찾고, 윗면 → 옆면 순서로 데칼을 만든다', () => {
    const result = resolveCakeRender(
      design({}, [text('A')], [deco('number-1'), deco('number-9')]),
      CATALOG,
    );
    expect(result).toEqual({
      ok: true,
      render: {
        shape: 'heart',
        design: 'drip',
        color: '#FFC2CF',
        scale: 0.82,
        decals: [
          expect.objectContaining({ face: 'top', deco: null }),
          expect.objectContaining({
            face: 'side',
            deco: { imageUrl: 'https://cdn/number-1.png', label: '1' },
          }),
          // 카탈로그에 없는 꾸미기는 이미지 없이 id를 적은 상자로
          expect.objectContaining({ face: 'side', deco: { imageUrl: null, label: 'number-9' } }),
        ],
      },
    });
  });

  it('같은 글자·색·효과(크기·위치는 달라도)는 같은 텍스처 key를 쓴다', () => {
    const result = resolveCakeRender(
      design({}, [text('A'), { ...text('A'), x: 0.1, size: 20 }, text('A', '#ffffff'), text('B')]),
      CATALOG,
    );
    if (!result.ok) throw new Error(result.reason);
    const [a, sameA, white, b] = result.render.decals.map((d) => d.key);
    expect(a).toBe(sameA);
    expect(new Set([a, white, b]).size).toBe(3);
  });

  it.each([
    ['카탈로그에 없는 시트 색', design({ sheetColor: 'gold' })],
    ['카탈로그에 없는 크기', design({ size: 'jumbo' })],
    ['배율이 없는 크기', design({ size: 'old' })],
    ['모르는 모양', design({ shape: 'moon' })],
    ['다음 스키마 버전', { ...design(), schemaVersion: 2 }],
  ])('%s → unsupported(비슷한 값으로 그리지 않는다)', (_, raw) => {
    expect(resolveCakeRender(raw, CATALOG)).toEqual({ ok: false, reason: 'unsupported' });
  });

  it('깨진 디자인은 invalid', () => {
    expect(resolveCakeRender({ schemaVersion: 1 }, CATALOG)).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it(`항목 ${MAX_ITEMS}개·텍스처 ${MAX_TEXTURES}장까지 그리고 넘으면 tooMany`, () => {
    const many = (count: number, distinct: number) =>
      Array.from({ length: count }, (_, i) => text(`T${i % distinct}`));
    expect(resolveCakeRender(design({}, many(MAX_ITEMS, MAX_TEXTURES)), CATALOG).ok).toBe(true);
    expect(resolveCakeRender(design({}, many(MAX_ITEMS + 1, 1)), CATALOG)).toEqual({
      ok: false,
      reason: 'tooMany',
    });
    expect(
      resolveCakeRender(design({}, many(MAX_TEXTURES + 1, MAX_TEXTURES + 1)), CATALOG),
    ).toEqual({
      ok: false,
      reason: 'tooMany',
    });
  });
});
