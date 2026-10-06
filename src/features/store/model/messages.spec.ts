import { ApiError } from '@/shared/api';

import { storeErrorMessage } from './messages';

const badInput = (code: string, message: string) =>
  new ApiError(message, 'BAD_USER_INPUT', code, 400);

describe('storeErrorMessage', () => {
  it.each([
    ['pickupSlotIntervalMinutes', 5, 180, '슬롯 간격은 5~180분 사이로 입력해 주세요.'],
    ['minLeadTimeMinutes', 0, 10080, '최소 리드타임은 0~10080분 사이로 입력해 주세요.'],
    ['maxDaysAhead', 1, 365, '예약 가능 일수는 1~365일 사이로 입력해 주세요.'],
    ['capacity', 1, 5000, '생산 수량은 1~5000개 사이로 입력해 주세요.'],
  ])('범위 오류의 영문 필드명 %s를 화면 이름으로 바꾼다', (field, min, max, expected) => {
    const e = badInput('FIELD_OUT_OF_RANGE', `${field}은(는) ${min}~${max} 사이여야 합니다.`);
    expect(storeErrorMessage(e)).toBe(expected);
  });

  it.each([
    ['모르는 필드', 'unknownField은(는) 1~2 사이여야 합니다.'],
    ['형식이 다른 문구', '범위를 벗어났습니다'],
  ])('범위 오류라도 %s면 영문을 노출하지 않는다', (_, message) => {
    const text = storeErrorMessage(badInput('FIELD_OUT_OF_RANGE', message));
    expect(text).toBe('입력한 값이 허용 범위를 벗어났어요.');
    expect(text).not.toMatch(/[A-Za-z]/);
  });

  it.each([
    ['CLOSE_BEFORE_OPEN', '종료 시각은 시작보다 늦어야 해요'],
    ['SPECIAL_CLOSURE_NOT_FOUND', '이미 삭제된 휴무예요.'],
    ['INVALID_IMAGE_URL', '로고를 다시 올려 주세요.'],
  ])('%s → 매장 문구', (code, expected) => {
    expect(storeErrorMessage(badInput(code, 'closeTime은 openTime보다 늦어야 합니다.'))).toBe(
      expected,
    );
  });

  it('매장 표에 없는 코드는 공용 문구로 넘긴다', () => {
    expect(storeErrorMessage(new ApiError('x', 'NOT_FOUND', 'STORE_NOT_FOUND', 404))).toBe(
      '매장 정보를 찾을 수 없습니다.',
    );
    expect(storeErrorMessage(new ApiError('x', 'NETWORK', null, 0))).toBe(
      '서버에 연결할 수 없습니다.',
    );
    expect(storeErrorMessage(new Error('boom'))).toBe('알 수 없는 오류가 발생했습니다.');
  });
});
