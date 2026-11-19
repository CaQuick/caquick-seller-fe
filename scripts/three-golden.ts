/**
 * 구매자 편집기(caquick-fe-v2 src/screens/custom)의 3D 코드로 골든 fixture를 만든다. 구매자 레포가 필요해 CI에서는 돌리지 않는다.
 *
 * 왜: 판매자 3D 렌더러는 구매자 편집기의 형상·투영·회전 코드를 복사해 쓰고, 두 앱이 같은 주문을 같은 모양으로 그려야 한다.
 * 비교 spec(src/features/custom/model/three/golden.spec.ts)이 이 파일이 만든 문서와 판매자 이식본을 1e-9 안에서 맞춰 본다.
 *
 * 사용: FT_DIR=<caquick-fe-v2 체크아웃> pnpm tsx scripts/three-golden.ts [ref]   (기본 ref는 GOLDEN_REF)
 *   원본은 고치지 않고 export만 덧붙여 비공개 함수와 컴포넌트를 꺼낸다. 컴포넌트 안 계산(배치·행렬·본체·데칼)은
 *   React 훅·R3F·DOM을 계산에 필요한 만큼만 흉내 낸 채 컴포넌트를 함수로 불러 얻는다. three는 이 레포의 것을 쓰므로
 *   설치본이 구매자 lock과 다른 버전이면 멈춘다.
 */
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as THREE from 'three';

import {
  buildGolden,
  GOLDEN_FIXTURE,
  GOLDEN_REF,
  goldenMeasure,
  type GoldenItem,
  installedVersions,
  PINNED_PACKAGES,
  type ThreeApi,
} from '../src/test/three-golden';

/* eslint-disable @typescript-eslint/no-explicit-any -- 구매자 모듈은 타입 없이 불러온다 */
type Module = Record<string, any>;
interface Element {
  props: Record<string, any>;
}

const STUB_REACT = `
export { createElement, Fragment } from 'react';
const g = globalThis;
export const useMemo = (create) => create();
export const useLayoutEffect = (effect) => { if (g.__goldenEffects) effect(); };
export const useRef = (initial) => ({ current: g.__goldenRef ?? initial });
export const useState = (init) => [typeof init === 'function' ? init() : init, () => undefined];
`;
const STUB_FIBER = `
export const useThree = (select) => select({ invalidate: () => undefined, get: () => ({}), size: { width: 390 } });
export const useFrame = () => undefined;
export const Canvas = () => null;
`;
// 컴포넌트 안에 묶인 함수·상수를 꺼낸다
const EXPORTS: Record<string, string[]> = {
  'SheetDesign.tsx': [
    'WaveDesign',
    'HeartDesign',
    'SparkleDesign',
    'DripDesign',
    'WallInstances',
    'seededRandom',
  ],
  'ItemDecal.tsx': ['TEXT_FONT_PX', 'PAD', 'DECO_CANVAS'],
  'CakeCanvas.tsx': ['Spin', 'SheetMesh', 'BEVEL'],
};

/** 구매자 lock(v9) 루트 importer에 적힌 설치 버전 */
function lockVersion(lock: string, name: string) {
  const match = new RegExp(
    `\\n {6}'?${name}'?:\\n {8}specifier: .+\\n {8}version: ([^\\s(]+)`,
  ).exec(lock);
  if (!match) throw new Error(`구매자 lock에 ${name}이 없다`);
  return match[1]!;
}

async function main(ftDir: string, ref: string) {
  const sha = execFileSync('git', ['-C', ftDir, 'rev-parse', '--short', ref]).toString().trim();
  const lock = execFileSync('git', ['-C', ftDir, 'show', `${sha}:pnpm-lock.yaml`]).toString();
  const buyerVersions = Object.fromEntries(
    PINNED_PACKAGES.map((name) => [name, lockVersion(lock, name)]),
  );
  const installed = installedVersions('.');
  if (JSON.stringify(buyerVersions) !== JSON.stringify(installed))
    throw new Error(
      `구매자 lock ${JSON.stringify(buyerVersions)} ≠ 설치본 ${JSON.stringify(installed)}. 같은 버전으로 맞춘 뒤 다시 만든다`,
    );

  const tmp = mkdtempSync(path.join(tmpdir(), 'three-golden-'));
  try {
    execFileSync('sh', [
      '-c',
      'git -C "$1" archive "$2" src/screens/custom | tar -x -C "$3"',
      'sh',
      ftDir,
      sha,
      tmp,
    ]);
    symlinkSync(path.resolve('node_modules'), path.join(tmp, 'node_modules'), 'dir');
    writeFileSync(path.join(tmp, 'stub-react.ts'), STUB_REACT);
    writeFileSync(path.join(tmp, 'stub-fiber.ts'), STUB_FIBER);

    const ui = path.join(tmp, 'src/screens/custom/ui');
    for (const name of readdirSync(ui)) {
      const file = path.join(ui, name);
      // tsx는 레포 밖 파일에 고전 JSX 변환(React.createElement)을 쓴다
      const header = name.endsWith('.tsx') ? `import * as React from '${tmp}/stub-react';\n` : '';
      const source = (header + readFileSync(file, 'utf8'))
        .replaceAll("from 'react';", `from '${tmp}/stub-react';`)
        .replaceAll("from '@react-three/fiber';", `from '${tmp}/stub-fiber';`);
      writeFileSync(file, source);
    }
    for (const [name, names] of Object.entries(EXPORTS))
      appendFileSync(path.join(ui, name), `\nexport { ${names.join(', ')} };\n`);

    // ItemDecal의 글자 폭 측정만 쓴다. 텍스처 그리기 효과는 돌지 않는다(useLayoutEffect 꺼짐)
    const context = { font: '', measureText: (text: string) => ({ width: goldenMeasure(text) }) };
    Object.assign(globalThis, {
      document: {
        body: {},
        createElement: () => ({ width: 0, height: 0, getContext: () => context }),
      },
      getComputedStyle: () => ({ fontFamily: 'Pretendard' }),
    });

    const load = async (name: string) =>
      (await import(pathToFileURL(path.join(ui, name)).href)) as Module;
    const outline = await load('sheetOutline.ts');
    const geometry = await load('sheetGeometry.ts');
    const projection = await load('sideProjection.ts');
    const design = await load('SheetDesign.tsx');
    const decal = await load('ItemDecal.tsx');
    const canvas = await load('CakeCanvas.tsx');

    const render = (component: any, props: Record<string, unknown>) => component(props) as Element;
    const children = (element: Element) => element.props.children as Element[];
    const g = globalThis as Record<string, unknown>;

    const api: ThreeApi = {
      constants: {
        SHEET_WIDTH: projection.SHEET_WIDTH,
        SHEET_HEIGHT: projection.SHEET_HEIGHT,
        STAGE_FILL: projection.STAGE_FILL,
        SIDE_ELEVATION: projection.SIDE_ELEVATION,
        SIDE_BAND_PERCENT: projection.SIDE_BAND_PERCENT,
        ITEM_WORLD_UNIT: projection.ITEM_WORLD_UNIT,
        BEVEL: canvas.BEVEL,
        TEXT_FONT_PX: decal.TEXT_FONT_PX,
        DECAL_PAD: decal.PAD,
        DECO_CANVAS: decal.DECO_CANVAS,
      },
      seededRandom: design.seededRandom,
      sheetOutline: outline.sheetOutline,
      createSheetShapes: geometry.createSheetShapes,
      body: (shape) => render(canvas.SheetMesh, { shape, color: '' }).props.geometry,
      sampleWall: projection.sampleWall,
      projectSidePoint: projection.projectSidePoint,
      wallPerimeter: projection.wallPerimeter,
      sideViewFactor: projection.sideViewFactor,
      designTopLift: design.designTopLift,
      designWallLift: design.designWallLift,
      wave: (shape) => render(design.WaveDesign, { shape, color: '' }).props.geometry,
      heart: (shape) => {
        const { geometry: heart, placements } = render(design.HeartDesign, {
          shape,
          color: '',
        }).props;
        return { geometry: heart, placements };
      },
      sparkle: (shape) => {
        const [dots, stars] = children(render(design.SparkleDesign, { shape }));
        return {
          dot: dots!.props.geometry,
          star: stars!.props.geometry,
          dots: dots!.props.placements,
          stars: stars!.props.placements,
        };
      },
      drip: (shape) => {
        const [shadow, drip, cap] = children(render(design.DripDesign, { shape, color: '' }));
        return {
          shadow: shadow!.props.geometry,
          drip: drip!.props.geometry,
          cap: cap!.props.geometry,
        };
      },
      wallMatrices: (shape, placements) => {
        const matrices: number[][] = [];
        const mesh = {
          instanceMatrix: {},
          setMatrixAt: (index: number, matrix: THREE.Matrix4) =>
            (matrices[index] = [...matrix.elements]),
        };
        Object.assign(g, { __goldenEffects: true, __goldenRef: mesh });
        try {
          design.WallInstances({ shape, geometry: null, color: '', placements });
        } finally {
          Object.assign(g, { __goldenEffects: false, __goldenRef: undefined });
        }
        return matrices;
      },
      itemDecal: (shape, face, item: GoldenItem, lift) =>
        render(decal.ItemDecal, {
          shape,
          face,
          lift,
          item: {
            id: 'golden',
            kind: item.kind === 'TEXT' ? 'text' : 'deco',
            x: item.x,
            y: item.y,
            size: item.size,
            effect: { type: 'none', intensity: 50 },
            text: item.text,
            color: '#1d1d1d',
            decoId: 'number-1',
          },
        }).props.geometry,
      createSpin: () => new canvas.Spin(),
    };

    const golden = { ref: sha, buyerVersions, ...buildGolden(api) };
    const out = path.resolve(GOLDEN_FIXTURE);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, `${stringify(golden, 0)}\n`);
    console.log(`${GOLDEN_FIXTURE} ← caquick-fe-v2 ${sha} (three r${THREE.REVISION})`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** 셋째 단계 아래는 한 줄로 써서 diff를 형상 단위로 읽게 한다 */
function stringify(value: unknown, depth: number): string {
  if (depth >= 3 || value === null || typeof value !== 'object' || Array.isArray(value))
    return JSON.stringify(value);
  const pad = '  '.repeat(depth + 1);
  const entries = Object.entries(value).map(
    ([key, child]) => `${pad}${JSON.stringify(key)}: ${stringify(child, depth + 1)}`,
  );
  return `{\n${entries.join(',\n')}\n${'  '.repeat(depth)}}`;
}

const ftDir = process.env.FT_DIR;
if (!ftDir) throw new Error('FT_DIR=<caquick-fe-v2 체크아웃>이 필요하다');
main(ftDir, process.argv[2] ?? GOLDEN_REF).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
