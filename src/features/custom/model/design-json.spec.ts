import { parseThreeDDesign } from './design-json';

const text = {
  kind: 'TEXT',
  x: 0.5,
  y: 0.4,
  size: 12,
  effect: { type: 'soft', intensity: 50 },
  text: '생일 축하해\n🎂',
  color: '#1D1D1D',
  decoId: null,
};
const deco = {
  kind: 'DECO',
  x: 0,
  y: 1,
  size: 30,
  effect: { type: 'none', intensity: 0 },
  text: null,
  color: null,
  decoId: 'number-3',
};
const valid = {
  schemaVersion: 1,
  basic: { shape: 'heart', size: 'no1', design: 'wave', flavor: 'choco', sheetColor: 'pink' },
  top: [text],
  side: [deco, { ...text, x: 1 }],
};

type Design = typeof valid;
type Item = typeof text | typeof deco;
const withBasic = (patch: Partial<Record<keyof Design['basic'], unknown>>) => ({
  ...valid,
  basic: { ...valid.basic, ...patch },
});
const withItem = (patch: Partial<Record<keyof Item, unknown>>) => ({
  ...valid,
  side: [{ ...text, ...patch }],
});

describe('parseThreeDDesign', () => {
  it('v1 디자인을 렌더 입력으로 옮기고 글자색은 대문자로 맞춘다', () => {
    const result = parseThreeDDesign({ ...valid, top: [{ ...text, color: '#ff00aa' }] });

    expect(result).toEqual({
      ok: true,
      design: {
        basic: valid.basic,
        top: [
          {
            kind: 'TEXT',
            x: 0.5,
            y: 0.4,
            size: 12,
            effect: { type: 'soft', intensity: 50 },
            text: '생일 축하해\n🎂',
            color: '#FF00AA',
          },
        ],
        side: [
          {
            kind: 'DECO',
            x: 0,
            y: 1,
            size: 30,
            effect: { type: 'none', intensity: 0 },
            decoId: 'number-3',
          },
          {
            kind: 'TEXT',
            x: 1,
            y: 0.4,
            size: 12,
            effect: { type: 'soft', intensity: 50 },
            text: '생일 축하해\n🎂',
            color: '#1D1D1D',
          },
        ],
      },
    });
  });

  // 그릴 수 있으면 그대로, 모르는 값은 unsupported(캡처 + 업데이트 안내), 깨진 값은 invalid(캡처)
  it.each<[string, 'ok' | 'unsupported' | 'invalid', unknown]>([
    ['디자인 없음(장식 없는 시트)', 'ok', withBasic({ design: null })],
    ['문구 디자인', 'ok', withBasic({ design: 'phrase' })],
    ['맛 없음', 'ok', withBasic({ flavor: null })],
    ['항목 없음', 'ok', { ...valid, top: [], side: [] }],
    [
      '크기·시트 색 key는 카탈로그에서 찾으므로 통과',
      'ok',
      withBasic({ size: 'xl', sheetColor: 'gold' }),
    ],
    [
      '꾸미기의 text·color 생략',
      'ok',
      { ...valid, side: [{ ...deco, text: undefined, color: undefined }] },
    ],
    ['좌표 경계 0·1', 'ok', withItem({ x: 0, y: 1 })],
    ['효과 강도 경계 100', 'ok', withItem({ effect: { type: 'pencil', intensity: 100 } })],
    ['버전 2', 'unsupported', { ...valid, schemaVersion: 2 }],
    ['버전 2 + 다른 구조', 'unsupported', { schemaVersion: 2, layers: [] }],
    ['버전 0', 'unsupported', { ...valid, schemaVersion: 0 }],
    ['모르는 모양', 'unsupported', withBasic({ shape: 'moon' })],
    ['형상 없는 디자인(물총)', 'unsupported', withBasic({ design: 'squirt' })],
    ['모르는 항목 종류', 'unsupported', withItem({ kind: 'STICKER' })],
    ['모르는 효과', 'unsupported', withItem({ effect: { type: 'glow', intensity: 50 } })],
    ['디자인 없음(null)', 'invalid', null],
    ['문자열', 'invalid', '{"schemaVersion":1}'],
    ['버전 없음', 'invalid', { ...valid, schemaVersion: undefined }],
    ['버전이 문자열', 'invalid', { ...valid, schemaVersion: '1' }],
    ['basic 없음', 'invalid', { ...valid, basic: undefined }],
    ['모양 null', 'invalid', withBasic({ shape: null })],
    ['side 배열 아님', 'invalid', { ...valid, side: {} }],
    ['x 범위 밖', 'invalid', withItem({ x: 1.01 })],
    ['y 음수', 'invalid', withItem({ y: -0.01 })],
    ['x NaN', 'invalid', withItem({ x: NaN })],
    ['크기 0', 'invalid', withItem({ size: 0 })],
    ['크기 무한대', 'invalid', withItem({ size: Infinity })],
    ['효과 강도 101', 'invalid', withItem({ effect: { type: 'soft', intensity: 101 } })],
    ['효과 강도 소수', 'invalid', withItem({ effect: { type: 'soft', intensity: 50.5 } })],
    ['효과 없음', 'invalid', withItem({ effect: null })],
    ['글자 빈 문자열', 'invalid', withItem({ text: '' })],
    ['글자 null', 'invalid', withItem({ text: null })],
    ['글자색 이름', 'invalid', withItem({ color: 'red' })],
    ['글자색 세 자리', 'invalid', withItem({ color: '#F0A' })],
    ['글자색 null', 'invalid', withItem({ color: null })],
    ['꾸미기 key 없음', 'invalid', { ...valid, side: [{ ...deco, decoId: null }] }],
    ['꾸미기 key 빈 문자열', 'invalid', { ...valid, side: [{ ...deco, decoId: '' }] }],
  ])('%s → %s', (_, expected, raw) => {
    const result = parseThreeDDesign(raw);
    expect(result.ok ? 'ok' : result.reason).toBe(expected);
  });

  it('여러 항목 중 하나만 그릴 수 없어도 디자인 전체를 캡처로 돌린다', () => {
    expect(parseThreeDDesign({ ...valid, top: [text, { ...deco, kind: 'IMAGE' }] })).toEqual({
      ok: false,
      reason: 'unsupported',
    });
    expect(parseThreeDDesign({ ...valid, side: [deco, { ...text, size: -1 }] })).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });
});
