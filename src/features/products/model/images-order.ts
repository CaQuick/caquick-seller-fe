export const IMAGES_COPY = {
  title: '이미지 관리',
  guide: '길게 눌러 순서를 바꿀 수 있어요. 첫 번째 사진이 대표 이미지예요 (최대 6장)',
  saveOrder: '순서 저장',
  orderSaved: '순서를 저장했어요',
  cover: '대표',
  lastImage: '이미지는 1장 이상 있어야 해요',
} as const;

/** 끌어 둔 순서를 지키면서 서버에서 사라진 장은 빼고 새로 생긴 장은 뒤에 붙인다 */
export function mergeOrder(order: readonly string[], serverIds: readonly string[]): string[] {
  const kept = order.filter((id) => serverIds.includes(id));
  return [...kept, ...serverIds.filter((id) => !kept.includes(id))];
}

export const isReordered = (order: readonly string[], serverIds: readonly string[]) =>
  order.some((id, i) => serverIds[i] !== id);
