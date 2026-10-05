import { ApiError, messageFor } from '@/shared/api';

/** 주문 상태 변경 오류 코드 → 문구. 나머지는 공용 표 */
const ORDER_ERRORS: Record<string, string> = {
  INVALID_ORDER_STATUS_TRANSITION: '주문 상태가 이미 바뀌었어요. 최신 내용을 확인해 주세요.',
  ORDER_NOT_CANCELLABLE: '지금 상태에서는 주문을 취소할 수 없어요.',
  ORDER_STATUS_UNCHANGED: '이미 같은 상태인 주문이에요.',
  CANCELLATION_NOTE_REQUIRED: '취소 사유를 입력해 주세요.',
  ORDER_NOT_FOUND: '주문을 찾을 수 없어요.',
};

export function orderErrorMessage(error: unknown): string {
  const known = error instanceof ApiError && error.code ? ORDER_ERRORS[error.code] : undefined;
  return known ?? messageFor(error);
}
