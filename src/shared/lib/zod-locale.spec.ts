import { z } from 'zod';

import { installZodKorean } from './zod-locale';

const message = (schema: z.ZodType, input: unknown) =>
  schema.safeParse(input).error?.issues[0]?.message;

describe('zod 한국어 문구', () => {
  beforeAll(() => installZodKorean());

  it.each<[string, z.ZodType, unknown, string]>([
    ['문자열 최대', z.string().max(80), 'a'.repeat(81), '80자 이하로 입력해 주세요.'],
    ['문자열 최소 1', z.string().min(1), '', '값을 입력해 주세요.'],
    ['문자열 최소', z.string().min(8), 'abc', '8자 이상 입력해 주세요.'],
    ['숫자 최대', z.number().max(90), 91, '90 이하로 입력해 주세요.'],
    ['숫자 미만', z.number().lt(100), 100, '100보다 작은 값을 입력해 주세요.'],
    ['숫자 최소', z.number().min(-90), -91, '-90 이상으로 입력해 주세요.'],
    ['숫자 초과', z.number().positive(), 0, '0보다 큰 값을 입력해 주세요.'],
    ['큰 수 구분 기호', z.number().max(100000), 100001, '100,000 이하로 입력해 주세요.'],
    ['정수', z.number().int(), 1.5, '정수를 입력해 주세요.'],
    ['숫자 아님', z.number(), 'x', '숫자를 입력해 주세요.'],
    ['NaN', z.number(), Number.NaN, '숫자를 입력해 주세요.'],
    ['값 없음', z.string(), undefined, '값을 입력해 주세요.'],
    ['타입 불일치', z.string(), 1, '입력 형식이 올바르지 않습니다.'],
    ['배열 최소 1', z.array(z.string()).min(1), [], '하나 이상 선택해 주세요.'],
    ['배열 최소', z.array(z.string()).min(2), ['a'], '2개 이상 선택해 주세요.'],
    ['배열 최대', z.array(z.string()).max(1), ['a', 'b'], '1개 이하로 선택해 주세요.'],
    ['이메일', z.email(), 'a', '올바른 이메일 주소를 입력해 주세요.'],
    ['웹 주소', z.url(), 'a', '올바른 웹 주소를 입력해 주세요.'],
    ['정규식', z.string().regex(/^\d+$/), 'a', '입력 형식이 올바르지 않습니다.'],
    ['보기', z.enum(['A', 'B']), 'C', '보기 중에서 선택해 주세요.'],
    ['배수', z.number().multipleOf(5), 7, '5의 배수로 입력해 주세요.'],
  ])('%s', (_, schema, input, expected) => {
    expect(message(schema, input)).toBe(expected);
  });

  it('처리하지 않는 규칙은 zod 한국어 로캘 문구로 둔다', () => {
    const schema = z.object({ a: z.string() }).strict();
    expect(message(schema, { a: 'x', b: 1 })).toMatch(/[가-힣]/);
  });

  it('스키마에 적은 메시지가 우선한다', () => {
    expect(message(z.string().max(3, '세 글자까지 쓸 수 있습니다.'), 'abcd')).toBe(
      '세 글자까지 쓸 수 있습니다.',
    );
  });

  it('영어 기본 문구가 남지 않는다', () => {
    const schemas: [z.ZodType, unknown][] = [
      [z.string().max(1), 'ab'],
      [z.number(), 'x'],
      [z.object({ a: z.string() }).strict(), { a: 'x', b: 1 }],
      [z.string().startsWith('a'), 'b'],
    ];
    for (const [schema, input] of schemas) {
      expect(message(schema, input)).not.toMatch(/[A-Za-z]{4,}/);
    }
  });
});
