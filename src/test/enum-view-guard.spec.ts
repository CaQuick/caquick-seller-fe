import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { enumValues, generatedEnums } from './generated-enums';

const ROOT = path.join(__dirname, '../..');

interface Scan {
  /** enumView( 인자 안의 Record<생성 enum, …> 수 */
  inside: number;
  /** 그 밖에서 나온 위치 */
  outside: string[];
}

const typeName = (name: ts.EntityName) => (ts.isIdentifier(name) ? name.text : name.right.text);

/** Record의 키 타입 안 어딘가에 생성 enum이 있으면 참(Partial·Exclude로 감싼 것 포함) */
function isEnumRecord(node: ts.Node, enums: ReadonlySet<string>): node is ts.TypeReferenceNode {
  if (!ts.isTypeReferenceNode(node) || typeName(node.typeName) !== 'Record') return false;
  const key = node.typeArguments?.[0];
  let found = false;
  const walk = (n: ts.Node) => {
    if (ts.isTypeReferenceNode(n) && enums.has(typeName(n.typeName))) found = true;
    ts.forEachChild(n, walk);
  };
  if (key) walk(key);
  return found;
}

/** 생성 enum으로 키를 둔 Record 선언이 enumView( 호출 인자 안에만 있는지 */
function scan(source: string, enums: ReadonlySet<string>, fileName = 'sample.ts'): Scan {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const result: Scan = { inside: 0, outside: [] };
  const visit = (node: ts.Node, inEnumView: boolean): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'enumView'
    ) {
      node.typeArguments?.forEach((t) => visit(t, inEnumView));
      node.arguments.forEach((arg) => visit(arg, true));
      return;
    }
    if (isEnumRecord(node, enums)) {
      if (inEnumView) result.inside += 1;
      else {
        const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
        result.outside.push(`${fileName}:${line + 1} ${node.getText(file)}`);
      }
    }
    ts.forEachChild(node, (child) => visit(child, inEnumView));
  };
  visit(file, false);
  return result;
}

/** 앱 소스(src·app). 생성물·스펙·선언 파일은 뺀다 */
function sourceFiles(): string[] {
  return ['src', 'app'].flatMap((dir) =>
    readdirSync(path.join(ROOT, dir), { recursive: true, encoding: 'utf8' })
      .map((rel) => path.join(dir, rel).split(path.sep).join('/'))
      .filter(
        (rel) =>
          /\.tsx?$/.test(rel) &&
          !rel.endsWith('.d.ts') &&
          !rel.includes('.spec.') &&
          !rel.startsWith('src/graphql/generated/'),
      ),
  );
}

describe('generatedEnums', () => {
  it('문자열 리터럴 유니온만 enum으로 읽고 설명 주석은 건너뛴다', () => {
    const source = [
      'export type Maybe<T> = T | null;',
      'export type CursorInput = {',
      '  cursor?: string;',
      '};',
      '/** 상태 */',
      'export type Status =',
      "  /** '입금' 대기; 설명 */",
      "  | 'PENDING'",
      "  | 'DONE';",
      'export type Mixed =',
      "  | 'A'",
      '  | number;',
    ].join('\n');
    expect([...generatedEnums(source)]).toEqual([['Status', ['PENDING', 'DONE']]]);
  });

  it("반증: 여러 줄 설명의 한 줄이 ';'로 끝나도 enum을 빠뜨리지 않는다", () => {
    const source = [
      'export type Status =',
      '  /**',
      '   * 입금 대기;',
      '   * 판매자에게 보이지 않는다.',
      '   */',
      "  | 'PENDING'",
      "  | 'DONE';",
    ].join('\n');
    expect([...generatedEnums(source)]).toEqual([['Status', ['PENDING', 'DONE']]]);
  });

  it('codegen 산출물의 enum을 읽는다', () => {
    const enums = generatedEnums();
    expect(enums.size).toBeGreaterThanOrEqual(10);
    expect(enumValues('OrderStatusType')).toEqual(
      expect.arrayContaining(['PENDING_PAYMENT', 'SUBMITTED', 'NO_SHOW', 'CANCELED']),
    );
    for (const values of enums.values()) expect(values.length).toBeGreaterThan(0);
  });
});

describe('enum-view 가드', () => {
  const enums = new Set(generatedEnums().keys());

  it.each<[string, string, number, number]>([
    ['타입 주석', 'const a: Record<OrderStatusType, string> = {};', 0, 1],
    ['Partial', 'const a: Partial<Record<AuditTargetType, string>> = {};', 0, 1],
    ['Exclude 키', "type A = Record<Exclude<OrderStatusType, 'CANCELED'>, string>;", 0, 1],
    [
      '밖에서 만든 표를 넘김',
      'const t: Record<OrderStatusType, V> = {};\nconst v = enumView<V>(t, f);',
      0,
      1,
    ],
    ['다른 함수 인자', 'const v = lookup({} satisfies Record<OrderStatusType, V>, f);', 0, 1],
    [
      'enumView 인자 안',
      'const v = enumView<V>({} satisfies Record<OrderStatusType, V>, f);',
      1,
      0,
    ],
    [
      'enumView 인자 안 Partial',
      "const v = enumView<string>({} satisfies Partial<Record<AuditTargetType, string>>, '');",
      1,
      0,
    ],
    ['문자열 키', 'const a: Record<string, string> = {};', 0, 0],
    ['enum이 아닌 키', 'const a: Record<Step, string> = {};', 0, 0],
  ])('%s', (_, source, inside, outside) => {
    const result = scan(source, enums);
    expect([result.inside, result.outside.length]).toEqual([inside, outside]);
  });

  const results = sourceFiles().map((rel) =>
    scan(readFileSync(path.join(ROOT, rel), 'utf8'), enums, rel),
  );

  it('앱 코드 파일과 enumView 표를 찾는다', () => {
    expect(results.length).toBeGreaterThan(100);
    expect(results.reduce((sum, r) => sum + r.inside, 0)).toBeGreaterThanOrEqual(5);
  });

  it('앱 코드에서 생성 enum으로 키를 둔 Record는 enumView 안에만 있다', () => {
    expect(results.flatMap((r) => r.outside)).toEqual([]);
  });
});
