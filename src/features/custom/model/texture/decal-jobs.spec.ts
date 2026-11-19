import { type DecalSpec } from '../render-input';
import { decalJobs, runSequential } from './decal-jobs';

const spec = (key: string, text: string): DecalSpec => ({
  key,
  face: 'top',
  item: {
    kind: 'TEXT',
    x: 0.5,
    y: 0.5,
    size: 10,
    effect: { type: 'none', intensity: 0 },
    text,
    color: '#1D1D1D',
  },
  deco: null,
});

describe('decalJobs', () => {
  it('같은 그림(key)은 한 번만 그리고, 텍스처 크기를 함께 정한다', () => {
    const jobs = decalJobs(
      [spec('a', 'A'), spec('b', 'ABCDEFGH'), spec('a', 'A')],
      (t) => t.length * 100,
    );
    expect([...jobs.keys()]).toEqual(['a', 'b']);
    // 폭 = ceil(max(측정 + 0.6em, 2em) + 여백 2개)
    expect(jobs.get('a')!.pixels).toEqual({ width: 192 + 48, height: 168 });
    expect(jobs.get('b')!.pixels).toEqual({ width: Math.ceil(800 + 57.6 + 48), height: 168 });
  });
});

describe('runSequential', () => {
  /** 예약한 일을 손으로 한 칸씩 돌린다 */
  function manual() {
    const queue: (() => void)[] = [];
    return {
      queue,
      schedule: (task: () => void) => void queue.push(task),
      tick: () => queue.shift()!(),
    };
  }
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it('한 번에 하나씩, 앞 일이 끝나고 스레드를 한 번 놓은 뒤 다음 일을 한다', async () => {
    const { queue, schedule, tick } = manual();
    const done: number[] = [];
    runSequential(
      [1, 2, 3],
      (n) => {
        done.push(n);
        return Promise.resolve();
      },
      jest.fn(),
      schedule,
    );
    expect(done).toEqual([]);
    tick();
    await flush();
    expect(done).toEqual([1]);
    expect(queue).toHaveLength(1);
    tick();
    await flush();
    tick();
    await flush();
    expect(done).toEqual([1, 2, 3]);
    tick();
    await flush();
    expect(queue).toHaveLength(0);
  });

  it('멈추면 다음 일은 하지 않고, 진행 중이던 일은 stopped()로 결과를 버린다', async () => {
    const { schedule, tick } = manual();
    let release!: () => void;
    const kept: number[] = [];
    const stop = runSequential(
      [1, 2],
      async (n, stopped) => {
        await new Promise<void>((resolve) => (release = resolve));
        if (!stopped()) kept.push(n);
      },
      jest.fn(),
      schedule,
    );
    tick();
    stop();
    release();
    await flush();
    expect(kept).toEqual([]);
  });

  it('실패하면 알리고 남은 일은 하지 않는다. 멈춘 뒤의 실패는 알리지 않는다', async () => {
    const { schedule, tick } = manual();
    const onError = jest.fn();
    const run = jest.fn(() => Promise.reject(new Error('GL')));
    runSequential([1, 2], run, onError, schedule);
    tick();
    await flush();
    expect(onError).toHaveBeenCalledWith(new Error('GL'));
    expect(run).toHaveBeenCalledTimes(1);

    const late = jest.fn();
    const stop = runSequential([1], run, late, schedule);
    tick();
    stop();
    await flush();
    expect(late).not.toHaveBeenCalled();
  });

  it('기본 예약은 setTimeout 0이다', () => {
    jest.useFakeTimers();
    const run = jest.fn(() => Promise.resolve());
    runSequential([1], run, jest.fn());
    expect(run).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(run).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
