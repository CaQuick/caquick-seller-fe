import { type RootState, useThree } from '@react-three/fiber';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';

import { type DesignId, type DesignItem } from '../../model/design-json';
import { type CakeRender, type DecalSpec } from '../../model/render-input';
import { type DecalPixels } from '../../model/three/decal-geometry';
import { designTopLift, heartPlacements, wallInstanceMatrix } from '../../model/three/sheet-design';
import { SHEET_HEIGHT, SIDE_ELEVATION, sideViewFactor } from '../../model/three/side-projection';
import { Spin } from '../../model/three/spin';
import { CakeScene, type CakeSceneProps } from './cake-scene';

const WIDTH = 390;

const item = (kind: DesignItem['kind']): DesignItem =>
  kind === 'TEXT'
    ? {
        kind,
        x: 0.5,
        y: 0.5,
        size: 10,
        effect: { type: 'none', intensity: 0 },
        text: 'A',
        color: '#1D1D1D',
      }
    : {
        kind,
        x: 0.25,
        y: 0.5,
        size: 20,
        effect: { type: 'none', intensity: 0 },
        decoId: 'number-1',
      };
const decal = (
  key: string,
  face: DecalSpec['face'],
  kind: DesignItem['kind'] = 'TEXT',
): DecalSpec => ({
  key,
  face,
  item: item(kind),
  deco: kind === 'DECO' ? { imageUrl: 'https://cdn/1.png', label: '1' } : null,
});
const render = (design: DesignId | null, decals: DecalSpec[] = []): CakeRender => ({
  shape: 'heart',
  design,
  color: '#FFC2CF',
  scale: 0.82,
  decals,
});
const PIXELS: DecalPixels = { width: 240, height: 168 };

let state: RootState | null = null;
function Capture() {
  const get = useThree((s) => s.get);
  useLayoutEffect(() => {
    state = get();
  });
  return null;
}

async function draw(props: Partial<CakeSceneProps> & { render: CakeRender }) {
  const scene: CakeSceneProps = {
    pixels: new Map(),
    textures: new Map(),
    spin: new Spin(),
    request: { yaw: 0 },
    ...props,
  };
  const tree = (patch: Partial<CakeSceneProps> = {}) => (
    <>
      <Capture />
      <CakeScene {...scene} {...patch} />
    </>
  );
  const renderer = await ReactThreeTestRenderer.create(tree(), {
    width: WIDTH,
    height: WIDTH,
    orthographic: true,
    frameloop: 'demand',
    flat: true,
  });
  return { renderer, rerender: (patch: Partial<CakeSceneProps>) => renderer.update(tree(patch)) };
}

const meshes = (renderer: Awaited<ReturnType<typeof draw>>['renderer']) =>
  renderer.scene.findAll((n) => n.instance instanceof THREE.Mesh);
const kind = (node: { instance: unknown }) =>
  node.instance instanceof THREE.InstancedMesh ? 'InstancedMesh' : 'Mesh';
const material = <T extends THREE.Material>(node: { instance: unknown }) =>
  (node.instance as THREE.Mesh).material as T;

describe('CakeScene', () => {
  it('옆모습 정사영 카메라·조명·시트 본체를 구매자 편집기 값으로 둔다', async () => {
    const { renderer } = await draw({ render: render(null) });
    const camera = state!.camera as THREE.OrthographicCamera;
    expect(camera.position.y / camera.position.z).toBeCloseTo(Math.tan(SIDE_ELEVATION), 9);
    expect(camera.position.length()).toBeCloseTo(10, 9);
    expect(camera.zoom).toBeCloseTo(((WIDTH * 0.96) / 2) * 0.82 * sideViewFactor('heart'), 9);

    expect(renderer.scene.findByType('AmbientLight').instance).toMatchObject({ intensity: 1.8 });
    const sun = renderer.scene.findByType('DirectionalLight').instance as THREE.DirectionalLight;
    expect(sun.position.toArray()).toEqual([1, 4, 2]);
    expect(sun.intensity).toBe(1.4);

    const [sheet, ...rest] = meshes(renderer);
    expect(rest).toEqual([]);
    expect(material<THREE.MeshLambertMaterial>(sheet!).color.getHexString()).toBe('ffc2cf');
    expect((sheet!.instance as THREE.Mesh).geometry).toBeInstanceOf(THREE.ExtrudeGeometry);
    await renderer.unmount();
  });

  it.each<[DesignId | null, string[]]>([
    [null, []],
    ['phrase', []],
    ['wave', ['Mesh:MeshLambertMaterial']],
    ['heart', ['InstancedMesh:MeshLambertMaterial']],
    ['sparkle', ['InstancedMesh:MeshLambertMaterial', 'InstancedMesh:MeshLambertMaterial']],
    ['drip', ['Mesh:MeshBasicMaterial', 'Mesh:MeshPhongMaterial', 'Mesh:MeshPhongMaterial']],
  ])('디자인 %s는 시트 위에 %j 장식을 둔다', async (design, expected) => {
    const { renderer } = await draw({ render: render(design) });
    const [, ...decorations] = meshes(renderer);
    expect(decorations.map((n) => `${kind(n)}:${material(n).type}`)).toEqual(expected);
    await renderer.unmount();
  });

  it('하트 장식은 둘레 배치마다 옆면 법선을 향해 세운다', async () => {
    const { renderer } = await draw({ render: render('heart') });
    const hearts = meshes(renderer).find((n) => kind(n) === 'InstancedMesh')!
      .instance as THREE.InstancedMesh;
    const placements = heartPlacements('heart');
    expect(hearts.count).toBe(placements.length);
    const matrix = new THREE.Matrix4();
    hearts.getMatrixAt(7, matrix);
    // 인스턴스 행렬은 float32로 저장된다
    expect(matrix.elements).toEqual(
      wallInstanceMatrix('heart', placements[7]!).elements.map(Math.fround),
    );
    await renderer.unmount();
  });

  it('흘림은 반투명 접촉 그림자 위에 반사광이 있는 크림을 얹는다', async () => {
    const { renderer } = await draw({ render: render('drip') });
    const [, shadow, drip] = meshes(renderer);
    expect(material(shadow!)).toMatchObject({
      opacity: 0.14,
      transparent: true,
      depthWrite: false,
    });
    expect(material<THREE.MeshPhongMaterial>(drip!).specular.getHexString()).toBe('2b2b2b');
    expect(material(drip!)).toMatchObject({
      shininess: 12,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    await renderer.unmount();
  });

  it('텍스처가 준비된 데칼만 스티커 재질로 붙이고, 윗면은 흘림 덮개 위로 띄운다', async () => {
    const texture = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    const { renderer } = await draw({
      render: render('drip', [
        decal('t', 'top'),
        decal('s', 'side', 'DECO'),
        decal('later', 'top'),
      ]),
      pixels: new Map([
        ['t', PIXELS],
        ['s', { width: 256, height: 256 }],
        ['later', PIXELS],
      ]),
      textures: new Map([
        ['t', texture],
        ['s', texture],
      ]),
    });
    const decals = meshes(renderer).filter((n) => material<THREE.MeshLambertMaterial>(n).map);
    expect(decals).toHaveLength(2);
    for (const node of decals) {
      expect((node.instance as THREE.Mesh).renderOrder).toBe(1);
      expect(material(node)).toMatchObject({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
    }
    const top = (decals[0]!.instance as THREE.Mesh).geometry.getAttribute('position');
    expect(top.getY(0)).toBeCloseTo(SHEET_HEIGHT / 2 + 0.004 + designTopLift('drip'), 6);
    await renderer.unmount();
  });

  it('바깥에서 정한 각도로 돌리고, 끌면 따라 돈 뒤 관성으로 멈춘다', async () => {
    const spin = new Spin();
    const { renderer, rerender } = await draw({
      render: render(null),
      spin,
      request: { yaw: Math.PI / 2 },
    });
    const group = renderer.scene.findByType('Group').instance as THREE.Group;
    await renderer.advanceFrames(1, 1 / 60);
    expect(group.rotation.y).toBeCloseTo(Math.PI / 2, 9);

    spin.start(0, 0);
    spin.drag(WIDTH / 4, 16, WIDTH);
    spin.end(16);
    await renderer.advanceFrames(1, 1 / 60);
    const afterDrag = group.rotation.y;
    expect(afterDrag).toBeGreaterThan(Math.PI);
    await renderer.advanceFrames(60, 1 / 60);
    expect(group.rotation.y).toBeGreaterThan(afterDrag);

    // 같은 각도를 다시 골라도(새 요청) 그 자세로 돌아간다
    await rerender({ request: { yaw: Math.PI / 2 } });
    await renderer.advanceFrames(1, 1 / 60);
    expect(group.rotation.y).toBeCloseTo(Math.PI / 2, 9);
    await renderer.unmount();
  });

  it('그릴 일이 있을 때만 다음 프레임을 요청한다(관성이 남았을 때만)', async () => {
    const spin = new Spin();
    const options = {
      width: WIDTH,
      height: WIDTH,
      orthographic: true,
      frameloop: 'demand' as const,
    };
    const renderer = await ReactThreeTestRenderer.create(<Capture />, options);
    // 테스트 렌더러의 invalidate는 아무 일도 하지 않아 장면이 받기 전에 바꿔 둔다
    const invalidate = jest.fn();
    state!.set({ invalidate });
    await renderer.update(
      <>
        <Capture />
        <CakeScene
          render={render(null)}
          pixels={new Map()}
          textures={new Map()}
          spin={spin}
          request={{ yaw: 0 }}
        />
      </>,
    );
    invalidate.mockClear();
    await renderer.advanceFrames(3, 1 / 60);
    expect(invalidate).not.toHaveBeenCalled();

    spin.start(0, 0);
    spin.drag(WIDTH / 4, 16, WIDTH);
    expect(invalidate).toHaveBeenCalledTimes(1);
    spin.end(16);
    invalidate.mockClear();
    await renderer.advanceFrames(1, 1 / 60);
    expect(invalidate).toHaveBeenCalledTimes(1);
    await renderer.unmount();
  });

  it('화면을 떠나면 만든 지오메트리를 모두 GPU에서 내린다', async () => {
    const dispose = jest.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const texture = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    const { renderer } = await draw({
      render: render('drip', [decal('t', 'top')]),
      pixels: new Map([['t', PIXELS]]),
      textures: new Map([['t', texture]]),
    });
    const geometries = new Set(meshes(renderer).map((n) => (n.instance as THREE.Mesh).geometry));
    dispose.mockClear();
    await renderer.unmount();
    const disposed = new Set(dispose.mock.contexts);
    for (const geometry of geometries) expect(disposed.has(geometry)).toBe(true);
    dispose.mockRestore();
  });
});
