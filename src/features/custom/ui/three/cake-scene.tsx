import { useFrame, useThree } from '@react-three/fiber';
import { type ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { type CakeRender, type DecalSpec } from '../../model/render-input';
import { createItemDecalGeometry, type DecalPixels } from '../../model/three/decal-geometry';
import { designTopLift, designWallLift } from '../../model/three/sheet-design';
import { createSheetBodyGeometry } from '../../model/three/sheet-geometry';
import {
  SHEET_WIDTH,
  SIDE_ELEVATION,
  sideViewFactor,
  STAGE_FILL,
} from '../../model/three/side-projection';
import { type Spin } from '../../model/three/spin';
import { SheetDesign } from './sheet-design';

// 구매자 편집기 CakeCanvas와 같은 값
const CAMERA_DISTANCE = 10;
const AMBIENT = 1.8;
const SUN = { position: [1, 4, 2] as const, intensity: 1.4 };

/** 바깥에서 정한 각도. 같은 각도를 다시 골라도 맞추도록 매번 새 객체로 넘긴다 */
export interface YawRequest {
  yaw: number;
}

/** 옆모습 정사영 카메라. 돌려도 잘리지 않게 모양의 최대 반지름만큼 줄여 본다 */
function CameraRig({ zoom }: { zoom: number }) {
  const get = useThree((state) => state.get);
  const width = useThree((state) => state.size.width);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    const camera = get().camera as THREE.OrthographicCamera;
    camera.position.set(
      0,
      Math.sin(SIDE_ELEVATION) * CAMERA_DISTANCE,
      Math.cos(SIDE_ELEVATION) * CAMERA_DISTANCE,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.zoom = ((width * STAGE_FILL) / SHEET_WIDTH) * zoom;
    camera.updateProjectionMatrix();
    invalidate();
  }, [get, invalidate, width, zoom]);
  return null;
}

/** 케이크를 세로축으로 돌린다. 끌면 따라 돌고 놓으면 관성으로 돌다 멈춘다 */
function Spinner({
  spin,
  request,
  children,
}: {
  spin: Spin;
  request: YawRequest;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => spin.setInvalidate(invalidate), [spin, invalidate]);
  useLayoutEffect(() => {
    spin.set(request.yaw);
    invalidate();
  }, [spin, invalidate, request]);
  useFrame((_, delta) => {
    const active = spin.step(delta);
    group.current!.rotation.y = spin.angle;
    if (active) invalidate();
  });
  return <group ref={group}>{children}</group>;
}

function SheetMesh({ shape, color }: Pick<CakeRender, 'shape' | 'color'>) {
  const geometry = useMemo(() => createSheetBodyGeometry(shape), [shape]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

/** 텍스처를 붙인 스티커 판. 윗면은 평평하게, 옆면은 둘레를 따라 휜다 */
function ItemDecal({
  shape,
  decal,
  pixels,
  texture,
  lift,
}: {
  shape: CakeRender['shape'];
  decal: DecalSpec;
  pixels: DecalPixels;
  texture: THREE.Texture;
  lift: number;
}) {
  const geometry = useMemo(
    () => createItemDecalGeometry(shape, decal.face, decal.item, pixels, lift),
    [shape, decal, pixels, lift],
  );
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} renderOrder={1}>
      <meshLambertMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}

export interface CakeSceneProps {
  render: CakeRender;
  /** 데칼 key별 텍스처 크기와 텍스처. 아직 그리지 못한 데칼은 붙이지 않는다 */
  pixels: ReadonlyMap<string, DecalPixels>;
  textures: ReadonlyMap<string, THREE.Texture>;
  spin: Spin;
  request: YawRequest;
}

/** 구매자 편집기의 옆모습 장면(시트·디자인 장식·윗면과 옆면 항목)을 그대로 옮긴 것 */
export function CakeScene({ render, pixels, textures, spin, request }: CakeSceneProps) {
  const { shape, design, color, scale } = render;
  const decals = (face: DecalSpec['face'], lift: number) =>
    render.decals.map((decal, index) => {
      const texture = textures.get(decal.key);
      const size = pixels.get(decal.key);
      return decal.face === face && texture && size ? (
        <ItemDecal
          key={index}
          shape={shape}
          decal={decal}
          pixels={size}
          texture={texture}
          lift={lift}
        />
      ) : null;
    });
  return (
    <>
      <CameraRig zoom={scale * sideViewFactor(shape)} />
      <ambientLight intensity={AMBIENT} />
      <directionalLight position={SUN.position} intensity={SUN.intensity} />
      <Spinner spin={spin} request={request}>
        <SheetMesh shape={shape} color={color} />
        {decals('top', designTopLift(design))}
        <SheetDesign shape={shape} design={design} color={color} />
        {decals('side', designWallLift(design))}
      </Spinner>
    </>
  );
}
