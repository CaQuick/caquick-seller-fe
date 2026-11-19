import { type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';

import { textWidth } from '@/shared/lib/skia-text';

import { type DecalSpec } from '../../model/render-input';
import { TEXT_FONT_PX } from '../../model/three/decal-geometry';
import { decalJobs, runSequential } from '../../model/texture/decal-jobs';
import { decalTexture, rasterizeDecal } from '../../model/texture/decal-raster';
import { loadDecoImage } from '../../model/texture/image-cache';

/**
 * 데칼 텍스처를 하나씩 차례로 그려 key별로 내준다. 그리는 동안 이미 된 것부터 붙는다.
 * 데칼이 바뀌거나 화면을 떠나면 만든 텍스처를 GPU에서 내린다
 */
export function useDecalTextures(
  decals: readonly DecalSpec[],
  fonts: SkTypefaceFontProvider | null,
  onError: (error: unknown) => void,
) {
  const jobs = useMemo(
    () => (fonts ? decalJobs(decals, (text) => textWidth(fonts, text, TEXT_FONT_PX)) : null),
    [decals, fonts],
  );
  const [textures, setTextures] = useState<ReadonlyMap<string, THREE.Texture>>(new Map());
  const reportError = useRef(onError);
  useEffect(() => {
    reportError.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!fonts || !jobs) return;
    const made: THREE.Texture[] = [];
    const stop = runSequential(
      [...jobs.values()],
      async (job, stopped) => {
        const image = job.deco?.imageUrl ? await loadDecoImage(job.deco.imageUrl) : null;
        if (stopped()) return;
        const texture = decalTexture(
          rasterizeDecal(job.item, job.pixels, { fonts, image, label: job.deco?.label }),
        );
        made.push(texture);
        setTextures((current) => new Map(current).set(job.key, texture));
      },
      (error) => reportError.current(error),
    );
    return () => {
      stop();
      made.forEach((texture) => texture.dispose());
      setTextures(new Map());
    };
  }, [jobs, fonts]);

  const pixels = useMemo(
    () => new Map([...(jobs?.values() ?? [])].map((job) => [job.key, job.pixels])),
    [jobs],
  );
  return { pixels, textures };
}
