import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { colors, fontSize, gradient, radius, shadow, tracking } from './tokens';

const ROOT = join(__dirname, '../../..');
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'generated' ? [] : listSources(p);
    return /\.(ts|tsx)$/.test(name) && !/\.spec\.tsx?$/.test(name) ? [p] : [];
  });
}

describe('디자인 토큰', () => {
  it('색은 hex 또는 rgba 문자열이고 반경·글자 크기는 양의 정수다', () => {
    for (const value of Object.values(colors)) expect(value).toMatch(/^(#[0-9A-F]{6}|rgba\(.+\))$/);
    for (const value of Object.values(radius))
      expect(Number.isInteger(value) && value > 0).toBe(true);
    for (const { size, lineHeight } of Object.values(fontSize))
      expect(lineHeight).toBeGreaterThan(size);
  });

  it('홈 히어로는 시안 CSS의 45deg 4단 그라디언트와 0 4px 14px 6% 그림자다', () => {
    expect(gradient.hero).toEqual({
      angle: 45,
      stops: [
        [0, '#D8D3FF'],
        [0.4, '#F6F5FF'],
        [0.6, '#FBFBFE'],
        [1, '#F5F5EB'],
      ],
    });
    expect(shadow.native.hero).toMatchObject({
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
    });
    expect(colors.homeTabFill).toBe('#E8E4FF');
  });

  it('tracking은 글자 크기에 em 비율을 곱한 px를 준다(기본 -0.01em)', () => {
    expect(tracking(14)).toBe(-0.14);
    expect(tracking(16, -0.02)).toBe(-0.32);
    expect(tracking(24, 0)).toBe(0);
  });

  // hex는 tokens.ts 한 곳에만(D8). 검사기가 실제로 잡는지 tokens.ts 자신으로 반증한다
  it('색 hex 리터럴은 tokens.ts 밖(src·app)에 없다', () => {
    const files = [...listSources(join(ROOT, 'src')), ...listSources(join(ROOT, 'app'))];
    const tokensFile = join(__dirname, 'tokens.ts');
    expect(files).toContain(tokensFile);
    expect(HEX.test(readFileSync(tokensFile, 'utf8'))).toBe(true);
    const offenders = files
      .filter((f) => f !== tokensFile && HEX.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
