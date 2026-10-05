import { cn } from './cn';

describe('cn', () => {
  it('거짓 값을 빼고 공백으로 잇는다', () => {
    expect(cn('a', false, null, undefined, 'b', '')).toBe('a b');
    expect(cn()).toBe('');
  });
});
