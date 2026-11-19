import { Spin } from './spin';

const W = 390;

describe('Spin', () => {
  it('화면 폭만큼 끌면 한 바퀴 돌고, 손을 떼면 관성으로 더 돌다 멈춘다', () => {
    const spin = new Spin();
    spin.start(0, 0);
    spin.drag(W, 100, W);
    expect(spin.angle).toBeCloseTo(Math.PI * 2);

    spin.end(110);
    const released = spin.angle;
    let frames = 0;
    while (spin.step(1 / 60)) frames += 1;

    expect(spin.angle).toBeGreaterThan(released);
    expect(frames).toBeGreaterThan(0);
    const stopped = spin.angle;
    expect(spin.step(1 / 60)).toBe(false);
    expect(spin.angle).toBe(stopped);
  });

  it('멈춘 채 100ms 넘게 있다가 손을 떼면 관성 없이 그 자리에 선다', () => {
    const spin = new Spin();
    spin.start(0, 0);
    spin.drag(100, 16, W);
    spin.end(200);
    const angle = spin.angle;

    expect(spin.step(1 / 60)).toBe(false);
    expect(spin.angle).toBe(angle);
  });

  // 마지막 이동 뒤 100ms까지는 끌던 손을 뗀 것으로, 그보다 늦으면 멈춘 채 뗀 것으로 본다
  it.each([
    [100, true],
    [101, false],
  ])('마지막 이동 %ims 뒤에 떼면 관성이 남는지: %s', (wait, coasting) => {
    const spin = new Spin();
    spin.start(0, 0);
    spin.drag(60, 16, W);
    spin.end(16 + wait);
    expect(spin.step(1 / 60)).toBe(coasting);
  });

  // 같은 시각에 이벤트가 몰려도 속도가 터지지 않도록 이동 간격은 1ms 아래로 잡지 않는다
  it.each([
    [0, 1],
    [0.5, 1],
    [2, 2],
  ])('%sms 간격 이동 직후 떼면 %ims 간격의 속도로 돈다', (gap, ms) => {
    const spin = new Spin();
    spin.start(0, 0);
    spin.drag(W / 100, gap, W);
    spin.end(gap);
    spin.step(1 / 60);

    const turn = (Math.PI * 2) / 100;
    expect(spin.angle).toBeCloseTo(turn + ((turn / (ms / 1000)) * 0.5) / 60, 12);
  });

  it('누르기 전 끌기·떼기는 무시하고, 다시 그릴 콜백을 걸지 않아도 동작한다', () => {
    const spin = new Spin();
    spin.drag(100, 16, W);
    spin.end(20);
    expect(spin.angle).toBe(0);

    spin.start(0, 0);
    spin.drag(-W / 4, 16, W);
    expect(spin.angle).toBeCloseTo(-Math.PI / 2);
    expect(spin.step(1 / 60)).toBe(true);
  });

  it('set·halt는 관성을 끊는다', () => {
    const spin = new Spin();
    const invalidate = jest.fn();
    spin.setInvalidate(invalidate);
    spin.start(0, 0);
    spin.drag(200, 16, W);
    spin.end(20);
    expect(invalidate).toHaveBeenCalledTimes(2);

    spin.halt();
    expect(spin.step(1 / 60)).toBe(false);
    spin.set(1.5);
    expect(spin.step(1 / 60)).toBe(false);
    expect(spin.angle).toBe(1.5);
  });
});
