import { type DecalSpec } from '../render-input';
import { type DecalPixels, decalPixelSize } from '../three/decal-geometry';

export interface DecalJob {
  key: string;
  item: DecalSpec['item'];
  deco: DecalSpec['deco'];
  pixels: DecalPixels;
}

/** 텍스처 하나를 그릴 일. 같은 그림(key)은 한 번만 그린다 */
export function decalJobs(decals: readonly DecalSpec[], measure: (text: string) => number) {
  const jobs = new Map<string, DecalJob>();
  for (const { key, item, deco } of decals)
    if (!jobs.has(key)) jobs.set(key, { key, item, deco, pixels: decalPixelSize(item, measure) });
  return jobs;
}

type Schedule = (task: () => void) => void;

const nextTick: Schedule = (task) => setTimeout(task, 0);

/**
 * 일을 한 번에 하나씩, 사이마다 JS 스레드를 놓아 주며 차례로 한다(한 번에 몰아 그리면 화면이 멈춘다).
 * 돌려준 함수를 부르면 다음 일부터 멈추고, 진행 중이던 일의 결과는 stopped()로 버린다
 */
export function runSequential<T>(
  jobs: readonly T[],
  run: (job: T, stopped: () => boolean) => Promise<void>,
  onError: (error: unknown) => void,
  schedule: Schedule = nextTick,
): () => void {
  let stopped = false;
  const isStopped = () => stopped;
  const step = (index: number) => {
    if (stopped || index >= jobs.length) return;
    run(jobs[index]!, isStopped).then(
      () => schedule(() => step(index + 1)),
      (error: unknown) => {
        if (!stopped) onError(error);
      },
    );
  };
  schedule(() => step(0));
  return () => {
    stopped = true;
  };
}
