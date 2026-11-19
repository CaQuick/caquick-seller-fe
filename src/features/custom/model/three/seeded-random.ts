// 구매자 편집기와 같은 코드다. 구매자 쪽이 바뀌면 같이 옮기고 골든 fixture를 다시 만든다(golden.spec이 1e-9로 비교).
/** 같은 값이 나오는 간단한 난수 (반짝이·흘림 위치가 매번 같게) */
export const seededRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
