import { enumValues } from '@/test/generated-enums';

import {
  CANCEL_FAULTS,
  type CancelForm,
  EMPTY_CANCEL_FORM,
  parseRefundAmount,
  refundNotice,
  SELLER_CANCEL_REASONS,
  toCancelInput,
} from './cancel-form';

const TOTAL = 38000;
const form = (patch: Partial<CancelForm>): CancelForm => ({
  ...EMPTY_CANCEL_FORM,
  reason: 'OUT_OF_MATERIALS',
  ...patch,
});

describe('사유·사정 선택지', () => {
  it('판매자 사유 6종만 두고 관리자·시스템 사유는 뺀다', () => {
    const reasons = SELLER_CANCEL_REASONS.map((r) => r.value);
    expect(reasons).toEqual([
      'DESIGN_NOT_FEASIBLE',
      'OUT_OF_MATERIALS',
      'SCHEDULE_UNAVAILABLE',
      'INAPPROPRIATE_REQUEST',
      'BUYER_REQUEST',
      'OTHER',
    ]);
    const rest = enumValues('OrderCancelReasonType').filter((r) => !reasons.includes(r as never));
    expect(rest.sort()).toEqual(['CONFIRM_TIMEOUT', 'PAYMENT_NOT_RECEIVED']);
  });

  it('사정은 생성 enum 값 전부다', () => {
    expect(CANCEL_FAULTS.map((f) => f.value).sort()).toEqual(
      [...enumValues('OrderCancelFaultType')].sort(),
    );
  });
});

describe('parseRefundAmount', () => {
  it.each<[string, number | null]>([
    ['0', 0],
    ['1', 1],
    ['37999', 37999],
    ['38000', 38000],
    ['38001', null],
    ['38,000', 38000],
    [' 1000 ', 1000],
    ['007', 7],
    ['', null],
    ['   ', null],
    ['-1', null],
    ['1.5', null],
    ['1e3', null],
    ['천원', null],
  ])("'%s' → %s", (text, expected) => {
    expect(parseRefundAmount(text, TOTAL)).toBe(expected);
  });
});

describe('toCancelInput', () => {
  it('사유가 없으면 보낼 수 없다', () => {
    expect(toCancelInput('reject', EMPTY_CANCEL_FORM, TOTAL)).toBeNull();
    expect(toCancelInput('cancel', { ...EMPTY_CANCEL_FORM, fault: 'SELLER' }, TOTAL)).toBeNull();
  });

  it('거절은 사유와 다듬은 메모만 보내고 사정·금액은 버린다', () => {
    expect(
      toCancelInput(
        'reject',
        form({ note: ' 딸기 소진 ', fault: 'BUYER', refundAmount: '1' }),
        TOTAL,
      ),
    ).toEqual({ reason: 'OUT_OF_MATERIALS', note: '딸기 소진' });
    expect(toCancelInput('reject', form({ note: '   ' }), TOTAL)).toEqual({
      reason: 'OUT_OF_MATERIALS',
    });
  });

  it('취소는 사정이 있어야 한다', () => {
    expect(toCancelInput('cancel', form({}), TOTAL)).toBeNull();
  });

  it('판매자 사정은 금액 없이 보낸다(전액 환불)', () => {
    expect(toCancelInput('cancel', form({ fault: 'SELLER', refundAmount: '5' }), TOTAL)).toEqual({
      reason: 'OUT_OF_MATERIALS',
      fault: 'SELLER',
    });
  });

  it.each<[string, number | null]>([
    ['', null],
    ['0', 0],
    ['38000', 38000],
    ['38001', null],
  ])("구매자 사정 금액 '%s' → %s", (refundAmount, expected) => {
    const input = toCancelInput(
      'cancel',
      form({ fault: 'BUYER', refundAmount, note: '연락 두절' }),
      TOTAL,
    );
    expect(input).toEqual(
      expected === null
        ? null
        : { reason: 'OUT_OF_MATERIALS', note: '연락 두절', fault: 'BUYER', refundAmount: expected },
    );
  });
});

describe('refundNotice', () => {
  const FULL = '결제 금액 38,000원 전액이 구매자에게 환불돼요. 환불 송금은 케이퀵이 진행해요.';

  it.each<
    [string, Parameters<typeof refundNotice>[0], Partial<CancelForm>, string | null, boolean]
  >([
    ['거절은 전액 환불', 'reject', {}, FULL, false],
    ['사정을 고르기 전에는 안내하지 않는다', 'cancel', {}, null, false],
    ['판매자 사정은 전액 환불', 'cancel', { fault: 'SELLER' }, FULL, false],
    ['구매자 사정 금액 미입력', 'cancel', { fault: 'BUYER' }, null, false],
    [
      '구매자 사정 0원',
      'cancel',
      { fault: 'BUYER', refundAmount: '0' },
      '환불 0원 · 남은 38,000원은 수수료를 뺀 뒤 매장 정산에 포함돼요',
      false,
    ],
    [
      '구매자 사정 일부',
      'cancel',
      { fault: 'BUYER', refundAmount: '10,000' },
      '환불 10,000원 · 남은 28,000원은 수수료를 뺀 뒤 매장 정산에 포함돼요',
      false,
    ],
    [
      '구매자 사정 전액이면 남는 정산이 없다',
      'cancel',
      { fault: 'BUYER', refundAmount: '38000' },
      FULL,
      false,
    ],
    [
      '결제액 초과',
      'cancel',
      { fault: 'BUYER', refundAmount: '38001' },
      '0원부터 38,000원까지 입력할 수 있어요',
      true,
    ],
  ])('%s', (_, mode, patch, text, error) => {
    expect(refundNotice(mode, form(patch), TOTAL)).toEqual(text === null ? null : { text, error });
  });
});
