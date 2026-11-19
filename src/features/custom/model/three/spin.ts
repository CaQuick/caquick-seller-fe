// 구매자 편집기와 같은 코드다. 구매자 쪽이 바뀌면 같이 옮기고 골든 fixture를 다시 만든다(golden.spec이 1e-9로 비교).
/** 손을 뗀 뒤 관성이 줄어드는 속도 */
const SPIN_DAMPING = 4;
const SPIN_EPSILON = 0.002;

/**
 * 케이크 회전 상태. 렌더 루프와 제스처 핸들러가 같이 쓰므로 React state 대신 객체로 들고 있는다.
 * 드래그 중에는 각도를 직접 따르고, 놓으면 관성으로 잠시 더 돌다가 멈춘다. 시각은 ms, 위치는 px이다.
 */
export class Spin {
  angle = 0;
  /** 손을 뗀 뒤 이어지는 관성 속도 (rad/s) */
  private velocity = 0;
  private dragging = false;
  private lastX = 0;
  private lastTime = 0;
  private invalidate: () => void = () => undefined;

  setInvalidate(invalidate: () => void) {
    this.invalidate = invalidate;
  }

  start(x: number, time: number) {
    this.dragging = true;
    this.velocity = 0;
    this.lastX = x;
    this.lastTime = time;
  }

  /** 화면 폭만큼 끌면 한 바퀴 돈다. */
  drag(x: number, time: number, width: number) {
    if (!this.dragging) return;
    const turn = ((x - this.lastX) / width) * Math.PI * 2;
    const seconds = Math.max(time - this.lastTime, 1) / 1000;
    this.angle += turn;
    this.velocity = this.velocity * 0.5 + (turn / seconds) * 0.5;
    this.lastX = x;
    this.lastTime = time;
    this.invalidate();
  }

  end(time: number) {
    if (!this.dragging) return;
    this.dragging = false;
    // 멈춘 채로 손을 뗐다면 관성을 주지 않는다.
    if (time - this.lastTime > 100) this.velocity = 0;
    this.invalidate();
  }

  set(angle: number) {
    this.angle = angle;
    this.velocity = 0;
  }

  /** 관성을 멈춰 현재 각도에 고정한다. */
  halt() {
    this.velocity = 0;
  }

  /** 한 프레임(delta 초) 진행하고, 다음 프레임이 더 필요한지 돌려준다. */
  step(delta: number) {
    if (!this.dragging) {
      this.angle += this.velocity * delta;
      this.velocity *= Math.exp(-SPIN_DAMPING * delta);
      if (Math.abs(this.velocity) < SPIN_EPSILON) this.velocity = 0;
    }
    return this.dragging || this.velocity !== 0;
  }
}
