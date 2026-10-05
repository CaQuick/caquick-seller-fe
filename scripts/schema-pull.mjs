#!/usr/bin/env node
// BE(caquick-be)의 SDL을 하나로 합쳐 schema/schema.graphql 스냅샷을 갱신한다.
// 사용: node scripts/schema-pull.mjs [ref]   (기본 develop)  |  BE_DIR=../caquick-be 로 로컬 체크아웃 사용
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO = 'https://github.com/CaQuick/caquick-be.git';
const ref = process.argv[2] ?? 'develop';
const out = path.resolve('schema/schema.graphql');

function listGraphql(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) files.push(...listGraphql(p));
    else if (name.endsWith('.graphql')) files.push(p);
  }
  return files;
}

let beDir = process.env.BE_DIR;
let tmp;
if (!beDir) {
  tmp = mkdtempSync(path.join(tmpdir(), 'caquick-be-'));
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', ref, REPO, tmp], {
    stdio: 'inherit',
  });
  beDir = tmp;
}
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: beDir }).toString().trim();
const root = path.join(beDir, 'src/features');
const files = listGraphql(root).sort((a, b) => a.localeCompare(b));
if (files.length === 0) throw new Error(`SDL 파일이 없다: ${root}`);

const parts = files.map((f) => {
  const rel = path.relative(beDir, f).replaceAll(path.sep, '/');
  return `# ---- ${rel} ----\n${readFileSync(f, 'utf8').trimEnd()}\n`;
});
const header = `# 생성 파일 — 수정하지 않는다. caquick-be ${process.env.BE_DIR ? 'local' : ref}@${sha} 의 src/features/**/*.graphql ${files.length}개를 경로순으로 합쳤다.\n# 갱신: pnpm schema:pull [ref]\n\n`;
writeFileSync(out, header + parts.join('\n'));
if (tmp) rmSync(tmp, { recursive: true, force: true });
console.log(`schema/schema.graphql ← ${files.length} files @ ${sha.slice(0, 7)}`);
