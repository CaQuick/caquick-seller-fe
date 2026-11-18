import { readFileSync } from 'node:fs';
import path from 'node:path';

const GENERATED = path.join(__dirname, '../graphql/generated/graphql.ts');

/** codegen 산출물의 enum(enumsAsTypes라 문자열 리터럴 유니온) 이름 → 값 목록 */
export function generatedEnums(source = readFileSync(GENERATED, 'utf8')): Map<string, string[]> {
  const enums = new Map<string, string[]>();
  for (const [, name, body] of source.matchAll(/^export type (\w+) =\n([\s\S]*?);$/gm)) {
    const values = body!.replace(/\/\*\*[\s\S]*?\*\//g, '');
    if (/^(\s*\|\s*'\w+')+\s*$/.test(values))
      enums.set(
        name!,
        [...values.matchAll(/'(\w+)'/g)].map((m) => m[1]!),
      );
  }
  return enums;
}

export function enumValues(name: string): string[] {
  const values = generatedEnums().get(name);
  if (!values) throw new Error(`생성 enum이 없다: ${name}`);
  return values;
}
