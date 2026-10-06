import { ApiError } from '@/shared/api';

import { orderErrorMessage } from './messages';

const err = (code: string | null, message = '서버 문구') =>
  new ApiError(message, 'BAD_USER_INPUT', code, 400);

describe('orderErrorMessage', () => {
  it.each([
    ['INVALID_ORDER_STATUS_TRANSITION', '주문 상태가 이미 바뀌었어요. 최신 내용을 확인해 주세요.'],
    ['ORDER_NOT_CANCELLABLE', '지금 상태에서는 주문을 취소할 수 없어요.'],
    ['CANCELLATION_NOTE_REQUIRED', '취소 사유를 입력해 주세요.'],
  ])('%s → %s', (code, message) => {
    expect(orderErrorMessage(err(code))).toBe(message);
  });

  it('표에 없으면 공용 문구 규칙을 따른다', () => {
    expect(orderErrorMessage(err('SOMETHING_ELSE'))).toBe('서버 문구');
    expect(orderErrorMessage(err('STORE_NOT_FOUND'))).toBe('매장 정보를 찾을 수 없습니다.');
    expect(orderErrorMessage(new Error('x'))).toBe('알 수 없는 오류가 발생했습니다.');
  });
});
