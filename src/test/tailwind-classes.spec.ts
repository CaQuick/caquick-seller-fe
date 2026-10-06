import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

import { isTailwindClass } from './tailwind';

// NativeWind는 theme에 없는 클래스를 경고 없이 버린다(text-text-2 → 글자색 없음, bg-tint-2 → 바탕 없음).
// 색 접두(text-·bg-·border-는 크기·정렬·굵기도 받는다)를 가진 토큰만 골라 tailwind가 만드는지 묻는다.
const COLOR_PREFIX =
  /^(?:[\w-]+:)*!?-?(?:bg|text|border(?:-[xytrblse])?|divide|outline|ring(?:-offset)?|fill|stroke|caret|accent|decoration|placeholder|shadow|from|via|to)-/;

const ROOT = join(__dirname, '../..');

interface Hit {
  line: number;
  cls: string;
}

/** 문자열·템플릿 리터럴의 정적 부분 — className 속성·cn() 인자·삼항·상수 어디에 있든 읽는다(주석은 제외) */
function colorTokens(code: string, file = 'x.tsx'): Hit[] {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const out: Hit[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      for (const cls of node.text.split(/\s+/)) {
        if (COLOR_PREFIX.test(cls)) out.push({ line, cls });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

const unknownColorClasses = (code: string) =>
  colorTokens(code)
    .map((t) => t.cls)
    .filter((cls) => !isTailwindClass(cls));

/** 흔한 실수(tint-2 ↔ tint2)면 고칠 이름을 붙인다 */
function suggest(cls: string): string {
  const fixed = cls.replace(/-(\d+)(?=$|\/)/, '$1');
  return fixed !== cls && isTailwindClass(fixed) ? ` → ${fixed}` : '';
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.(spec|d)\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('tailwind 색 클래스 검사', () => {
  it.each([
    'bg-tint-2',
    'text-text-2',
    'text-text-3',
    'border-line-2',
    'text-placeholder-2',
    'bg-tint-2/50',
    'active:bg-tint-2',
    'ios:text-text-2',
    'border-b-track-2',
    'fill-step-done-2',
    'text-primaryStrong',
    'bg-unknown',
  ])('theme에 없는 색 %s를 잡는다', (cls) => {
    expect(unknownColorClasses(`const c = '${cls}';`)).toEqual([cls]);
  });

  it.each([
    'bg-tint2',
    'text-text2',
    'text-text3',
    'border-line2',
    'text-placeholder2',
    'bg-tint2/50',
    'active:bg-tint2',
    'ios:text-text2',
    'border-b-track2',
    'text-primary-strong',
    'bg-danger-bg',
    'bg-transparent',
    'text-white',
    'bg-[#F7F7FF]',
    'text-5xl',
    'text-[13px]',
    'text-center',
    'border-2',
    'border-b',
    'border-dashed',
    'shadow-card',
  ])('있는 색·색 아닌 같은 접두 유틸 %s는 통과시킨다', (cls) => {
    expect(colorTokens(`const c = '${cls}';`)).toHaveLength(1);
    expect(unknownColorClasses(`const c = '${cls}';`)).toEqual([]);
  });

  it('className 속성·cn() 인자·삼항·템플릿 리터럴 안의 클래스를 읽고 주석은 건너뛴다', () => {
    const code = [
      '// bg-tint-2는 예전 이름',
      'const ok = true;',
      'const x = 1;',
      'export const A = () => (',
      '  <View className="text-text-3 p-3" contentContainerClassName="border-line-2">',
      "    <Text className={cn('h-12', ok ? 'bg-tint-2' : 'bg-tint2', `text-text-2 mt-${x} text-muted`)} />",
      '  </View>',
      ');',
    ].join('\n');
    expect(unknownColorClasses(code)).toEqual([
      'text-text-3',
      'border-line-2',
      'bg-tint-2',
      'text-text-2',
    ]);
  });

  it('template으로 조립한 색 클래스 조각도 잡는다 — tailwind가 미리 만들 수 없다', () => {
    expect(unknownColorClasses('const c = `bg-${tone}`;')).toEqual(['bg-']);
  });

  it('흔한 실수는 고칠 이름을 붙인다', () => {
    expect(suggest('bg-tint-2')).toBe(' → bg-tint2');
    expect(suggest('active:text-text-3/50')).toBe(' → active:text-text3/50');
    expect(suggest('bg-unknown')).toBe('');
  });

  it('앱 소스(src·app)에 tailwind가 만들지 않는 색 클래스가 없다', () => {
    const files = [...sourceFiles(join(ROOT, 'src')), ...sourceFiles(join(ROOT, 'app'))];
    const scanned: string[] = [];
    const hits: string[] = [];
    for (const file of files) {
      const name = relative(ROOT, file);
      for (const { line, cls } of colorTokens(readFileSync(file, 'utf8'), file)) {
        scanned.push(`${name} ${cls}`);
        if (!isTailwindClass(cls)) hits.push(`${name}:${line} ${cls}${suggest(cls)}`);
      }
    }
    // 스캔이 비어서 통과하지 않도록 — InfoBox의 바탕·글자색을 실제로 읽었는지 확인한다
    expect(scanned).toEqual(
      expect.arrayContaining([
        'src/features/store/ui/parts.tsx bg-tint2',
        'src/features/store/ui/parts.tsx text-text3',
      ]),
    );
    expect(hits).toEqual([]);
  });
});
