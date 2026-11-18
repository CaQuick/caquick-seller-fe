import { enumView } from './enum-view';

describe('enumView', () => {
  const view = enumView({ A: '가', B: '나' }, '폴백');

  it.each([
    ['A', '가'],
    ['B', '나'],
    ['C', '폴백'],
    ['', '폴백'],
    ['a', '폴백'],
    ['toString', '폴백'],
    ['constructor', '폴백'],
    ['hasOwnProperty', '폴백'],
    ['__proto__', '폴백'],
  ])('%s → %s', (key, expected) => {
    expect(view(key)).toBe(expected);
  });

  it('표 값이 거짓이어도 폴백으로 바꾸지 않는다', () => {
    const flags = enumView<string | boolean>({ OFF: false, EMPTY: '' }, true);
    expect(flags('OFF')).toBe(false);
    expect(flags('EMPTY')).toBe('');
    expect(flags('NEW')).toBe(true);
  });
});
