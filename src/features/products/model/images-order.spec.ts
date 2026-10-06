import { isReordered, mergeOrder } from './images-order';

describe('mergeOrder', () => {
  it.each<[string, string[], string[], string[]]>([
    ['처음엔 서버 순서', [], ['a', 'b', 'c'], ['a', 'b', 'c']],
    ['끌어 둔 순서를 지킨다', ['c', 'a', 'b'], ['a', 'b', 'c'], ['c', 'a', 'b']],
    ['지운 장은 빠진다', ['c', 'a', 'b'], ['a', 'c'], ['c', 'a']],
    ['새 장은 뒤에 붙는다', ['b', 'a'], ['a', 'b', 'd'], ['b', 'a', 'd']],
  ])('%s', (_, order, server, expected) => {
    expect(mergeOrder(order, server)).toEqual(expected);
  });
});

describe('isReordered', () => {
  it('같은 순서면 거짓, 하나라도 다르면 참이다', () => {
    expect(isReordered(['a', 'b'], ['a', 'b'])).toBe(false);
    expect(isReordered(['b', 'a'], ['a', 'b'])).toBe(true);
  });
});
