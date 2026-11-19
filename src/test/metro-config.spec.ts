/**
 * @jest-environment node
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

// export·doctor는 번들이 만들어지는지만 본다. three의 require 입구(three.cjs)는 번들이 되지만 RN에서
// process.emitWarning을 불러 죽으므로, R3F 번들이 쓰는 require('three')가 어디로 풀리는지 Metro 해석기로 본다.
const ROOT = join(__dirname, '../..');

interface Resolution {
  filePath?: string;
}
type Resolve = (context: object, moduleName: string, platform: string) => Resolution;
interface MetroConfig {
  resolver: {
    assetExts: string[];
    sourceExts: string[];
    resolverMainFields: string[];
    unstable_conditionsByPlatform?: Record<string, string[]>;
    resolveRequest: Resolve;
  };
}

// 설정 파일과 해석기는 CommonJS다
const { resolve } = require('metro-resolver') as { resolve: Resolve };
const config = require('../../metro.config.js') as MetroConfig;

const lookup = (path: string) => {
  if (!existsSync(path)) return { exists: false };
  const stat = statSync(path);
  return { exists: true, type: stat.isDirectory() ? 'd' : 'f', realPath: path };
};

/** 가장 가까운 package.json(node_modules 경계까지) */
function packageFor(path: string) {
  for (
    let dir = path;
    dir !== dirname(dir) && basename(dir) !== 'node_modules';
    dir = dirname(dir)
  ) {
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest))
      return {
        rootPath: dir,
        packageJson: JSON.parse(readFileSync(manifest, 'utf8')) as object,
        packageRelativePath: relative(dir, path),
      };
  }
  return null;
}

/** R3F 네이티브 번들(CommonJS)이 require로 부르는 자리의 Metro 해석 문맥 */
const context = (isESMImport: boolean) => ({
  allowHaste: false,
  assetExts: new Set(config.resolver.assetExts),
  customResolverOptions: {},
  disableHierarchicalLookup: false,
  doesFileExist: (path: string) => lookup(path).type === 'f',
  extraNodeModules: null,
  dev: true,
  getPackage: (path: string) => packageFor(dirname(path))?.packageJson ?? null,
  getPackageForModule: packageFor,
  isESMImport,
  fileSystemLookup: lookup,
  mainFields: config.resolver.resolverMainFields,
  originModulePath: join(
    ROOT,
    'node_modules/@react-three/fiber/native/dist/react-three-fiber-native.cjs.js',
  ),
  nodeModulesPaths: [],
  preferNativePlatform: true,
  redirectModulePath: (path: string) => path,
  resolveAsset: () => null,
  resolveHasteModule: () => undefined,
  resolveHastePackage: () => undefined,
  resolveRequest: resolve,
  sourceExts: config.resolver.sourceExts,
  unstable_conditionNames: [],
  unstable_conditionsByPlatform: config.resolver.unstable_conditionsByPlatform ?? {},
  unstable_enablePackageExports: true,
  unstable_logWarning: () => undefined,
});

const at = (resolution: Resolution) => relative(ROOT, resolution.filePath ?? '');

describe('metro.config', () => {
  it.each(['ios', 'android'])(
    '%s: require·import 모두 three의 ESM 입구 하나로 푼다',
    (platform) => {
      for (const isESMImport of [false, true])
        expect(at(config.resolver.resolveRequest(context(isESMImport), 'three', platform))).toBe(
          'node_modules/three/build/three.module.js',
        );
    },
  );

  // 설정 없이 Metro 기본으로 풀면 require는 three.cjs로 간다(검사기가 실제로 잡는지)
  it('반증: 기본 해석의 require는 three.cjs로 간다', () => {
    expect(at(resolve(context(false), 'three', 'android'))).toBe(
      'node_modules/three/build/three.cjs',
    );
  });

  it('다른 패키지 해석은 그대로 둔다', () => {
    expect(at(config.resolver.resolveRequest(context(false), 'zustand', 'android'))).toBe(
      at(resolve(context(false), 'zustand', 'android')),
    );
  });
});
