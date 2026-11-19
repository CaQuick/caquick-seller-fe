import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { renderColors } from '@/shared/config/tokens';

import { type DesignId, type ShapeId } from '../../model/design-json';
import {
  createCapGeometry,
  createDotGeometry,
  createDripGeometry,
  createHeartGeometry,
  createStarGeometry,
  createWaveGeometry,
  DRIP_SHADOW_GROW,
  heartPlacements,
  sparklePlacements,
  wallInstanceMatrix,
  type WallPlacement,
} from '../../model/three/sheet-design';

// 재질 값은 구매자 편집기 SheetDesign과 같다
const DRIP_SHININESS = 12;
const DRIP_SHADOW_OPACITY = 0.14;

/** 만든 지오메트리를 바뀌거나 사라질 때 GPU에서 내린다 */
function useDisposed(geometry: THREE.BufferGeometry) {
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
}

function WaveDesign({ shape, color }: { shape: ShapeId; color: string }) {
  const geometry = useMemo(() => createWaveGeometry(shape), [shape]);
  useDisposed(geometry);
  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial
        color={color}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

/** 같은 모양의 작은 장식을 옆면 여러 곳에 세운다 */
function WallInstances({
  shape,
  geometry,
  color,
  placements,
}: {
  shape: ShapeId;
  geometry: THREE.BufferGeometry;
  color: string;
  placements: WallPlacement[];
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    const instanced = mesh.current!;
    placements.forEach((placement, index) =>
      instanced.setMatrixAt(index, wallInstanceMatrix(shape, placement)),
    );
    instanced.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [shape, placements, invalidate]);
  return (
    <instancedMesh
      key={placements.length}
      ref={mesh}
      args={[geometry, undefined, placements.length]}
      frustumCulled={false}
    >
      <meshLambertMaterial color={color} />
    </instancedMesh>
  );
}

function HeartDesign({ shape, color }: { shape: ShapeId; color: string }) {
  const geometry = useMemo(() => createHeartGeometry(), []);
  useDisposed(geometry);
  const placements = useMemo(() => heartPlacements(shape), [shape]);
  return <WallInstances shape={shape} geometry={geometry} color={color} placements={placements} />;
}

function SparkleDesign({ shape }: { shape: ShapeId }) {
  const dot = useMemo(() => createDotGeometry(), []);
  const star = useMemo(() => createStarGeometry(), []);
  const { dots, stars } = useMemo(() => sparklePlacements(), []);
  useDisposed(dot);
  useDisposed(star);
  return (
    <>
      <WallInstances shape={shape} geometry={dot} color={renderColors.sparkle} placements={dots} />
      <WallInstances
        shape={shape}
        geometry={star}
        color={renderColors.sparkle}
        placements={stars}
      />
    </>
  );
}

function DripDesign({ shape, color }: { shape: ShapeId; color: string }) {
  const drip = useMemo(() => createDripGeometry(shape), [shape]);
  const shadow = useMemo(() => createDripGeometry(shape, DRIP_SHADOW_GROW), [shape]);
  const cap = useMemo(() => createCapGeometry(shape), [shape]);
  useDisposed(drip);
  useDisposed(shadow);
  useDisposed(cap);
  return (
    <>
      {/* 크림 아래 얇고 어두운 띠. 접촉 그림자처럼 보인다 */}
      <mesh geometry={shadow}>
        <meshBasicMaterial
          color={renderColors.shadow}
          transparent
          opacity={DRIP_SHADOW_OPACITY}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={drip}>
        <meshPhongMaterial
          color={color}
          specular={renderColors.dripSpecular}
          shininess={DRIP_SHININESS}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      <mesh geometry={cap}>
        <meshPhongMaterial
          color={color}
          specular={renderColors.dripSpecular}
          shininess={DRIP_SHININESS}
        />
      </mesh>
    </>
  );
}

/** 시트 디자인 장식. 문구(phrase)와 디자인 없음은 장식 없이 시트만 */
export function SheetDesign({
  shape,
  design,
  color,
}: {
  shape: ShapeId;
  design: DesignId | null;
  color: string;
}) {
  switch (design) {
    case 'wave':
      return <WaveDesign shape={shape} color={color} />;
    case 'heart':
      return <HeartDesign shape={shape} color={color} />;
    case 'sparkle':
      return <SparkleDesign shape={shape} />;
    case 'drip':
      return <DripDesign shape={shape} color={color} />;
    default:
      return null;
  }
}
