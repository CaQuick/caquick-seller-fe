import { ApiError, messageFor } from '@/shared/api';

/** 주문 상태 변경·거절·취소 오류 코드 → 문구. 나머지는 공용 표 */
const ORDER_ERRORS: Record<string, string> = {
  INVALID_ORDER_STATUS_TRANSITION: '주문 상태가 이미 바뀌었어요. 최신 내용을 확인해 주세요.',
  ORDER_NOT_CANCELLABLE: '지금 상태에서는 주문을 취소할 수 없어요.',
  CANCEL_REASON_NOT_ALLOWED: '이 주문에는 고를 수 없는 사유예요. 다른 사유를 골라 주세요.',
  CANCEL_FAULT_REQUIRED: '판매자 사정인지 구매자 사정인지 골라 주세요.',
  REFUND_AMOUNT_REQUIRED: '구매자 사정이면 돌려줄 금액을 입력해 주세요.',
  REFUND_AMOUNT_OUT_OF_RANGE: '환불 금액은 0원부터 결제 금액까지 입력할 수 있어요.',
  NO_SHOW_NOT_ALLOWED: '노쇼는 픽업 시각부터 24시간 안에만 처리할 수 있어요.',
  ORDER_STATUS_UNCHANGED: '이미 같은 상태인 주문이에요.',
  ORDER_NOT_FOUND: '주문을 찾을 수 없어요.',
};

export function orderErrorMessage(error: unknown): string {
  const known = error instanceof ApiError && error.code ? ORDER_ERRORS[error.code] : undefined;
  return known ?? messageFor(error);
}
