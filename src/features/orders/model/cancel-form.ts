import {
  type OrderCancelFaultType,
  type OrderCancelReasonType,
  type SellerCancelOrderInput,
} from '@/graphql/generated/graphql';
import { formatKrw } from '@/shared/lib/format';

/** 접수 단계 거절(전액 환불)과 확정·제작 완료 뒤 취소(사정에 따라 환불) */
export type CancelMode = 'reject' | 'cancel';

export type CancelInput = Omit<SellerCancelOrderInput, 'orderId'>;

/** 판매자가 고를 수 있는 사유. 관리자·시스템 전용 값은 넣지 않는다 */
export const SELLER_CANCEL_REASONS = [
  { value: 'DESIGN_NOT_FEASIBLE', label: '제작할 수 없는 디자인' },
  { value: 'OUT_OF_MATERIALS', label: '재료 소진' },
  { value: 'SCHEDULE_UNAVAILABLE', label: '일정 불가' },
  { value: 'INAPPROPRIATE_REQUEST', label: '부적절한 요청' },
  { value: 'BUYER_REQUEST', label: '구매자 요청' },
  { value: 'OTHER', label: '기타' },
] as const satisfies readonly { value: OrderCancelReasonType; label: string }[];

export const CANCEL_FAULTS = [
  { value: 'SELLER', label: '판매자 사정' },
  { value: 'BUYER', label: '구매자 사정' },
] as const satisfies readonly { value: OrderCancelFaultType; label: string }[];

export const CANCEL_COPY = {
  reject: {
    title: '주문을 거절할까요?',
    description: '구매자에게 거절 사유가 전달돼요',
    confirm: '거절 확정',
    done: '주문을 거절했어요',
  },
  cancel: {
    title: '주문을 취소할까요?',
    description: '구매자에게 취소 사유가 전달돼요',
    confirm: '취소 확정',
    done: '주문을 취소했어요',
  },
} as const;

export interface CancelForm {
  reason: OrderCancelReasonType | null;
  note: string;
  fault: OrderCancelFaultType | null;
  /** 구매자 사정일 때 돌려줄 금액(입력 그대로) */
  refundAmount: string;
}

export const EMPTY_CANCEL_FORM: CancelForm = {
  reason: null,
  note: '',
  fault: null,
  refundAmount: '',
};

/** 돌려줄 금액. 숫자(쉼표 허용)가 아니거나 0~결제액 밖이면 null */
export function parseRefundAmount(text: string, total: number): number | null {
  const digits = text.trim().replace(/,/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const amount = Number(digits);
  return amount <= total ? amount : null;
}

/** 보낼 입력. 사유·사정·금액이 덜 채워졌거나 틀리면 null */
export function toCancelInput(mode: CancelMode, form: CancelForm, total: number) {
  if (!form.reason) return null;
  const note = form.note.trim();
  const base: CancelInput = { reason: form.reason, ...(note ? { note } : {}) };
  if (mode === 'reject') return base;
  if (form.fault === 'SELLER') return { ...base, fault: form.fault };
  if (form.fault !== 'BUYER') return null;
  const refundAmount = parseRefundAmount(form.refundAmount, total);
  return refundAmount === null ? null : { ...base, fault: form.fault, refundAmount };
}

const fullRefund = (total: number) =>
  total > 0
    ? `결제 금액 ${formatKrw(total)} 전액이 구매자에게 환불돼요. 환불 송금은 케이퀵이 진행해요.`
    : '환불할 결제 금액이 없어요';

/** 시트 아래 환불 안내. 정할 수 없으면 null, 금액이 틀리면 error */
export function refundNotice(
  mode: CancelMode,
  form: CancelForm,
  total: number,
): { text: string; error: boolean } | null {
  if (mode === 'reject' || form.fault === 'SELLER')
    return { text: fullRefund(total), error: false };
  if (form.fault !== 'BUYER' || form.refundAmount.trim() === '') return null;
  const amount = parseRefundAmount(form.refundAmount, total);
  if (amount === null)
    return { text: `0원부터 ${formatKrw(total)}까지 입력할 수 있어요`, error: true };
  if (amount === total) return { text: fullRefund(total), error: false };
  return {
    text: `환불 ${formatKrw(amount)} · 남은 ${formatKrw(total - amount)}은 수수료를 뺀 뒤 매장 정산에 포함돼요`,
    error: false,
  };
}
