import {
  ApiError,
  FORBIDDEN_CODES,
  MESSAGES,
  classifyStatus,
  isForbiddenCode,
  isTransientError,
  messageFor,
} from './errors';

describe('classifyStatus', () => {
  it.each([
    [400, 'BAD_USER_INPUT'],
    [422, 'BAD_USER_INPUT'],
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [429, 'TOO_MANY_REQUESTS'],
    [500, 'INTERNAL_SERVER_ERROR'],
    [503, 'INTERNAL_SERVER_ERROR'],
  ] as const)('%d → %s', (status, expected) => {
    expect(classifyStatus(status)).toBe(expected);
  });
});

describe('isForbiddenCode', () => {
  it.each(FORBIDDEN_CODES)('%s는 세션 분기 코드다', (code) => {
    expect(isForbiddenCode(code)).toBe(true);
  });

  it.each(['STORE_NOT_FOUND', 'FORBIDDEN', '', null])('반증: %s는 아니다', (code) => {
    expect(isForbiddenCode(code)).toBe(false);
  });
});

describe('isTransientError', () => {
  it.each([
    ['NETWORK', 0, true],
    ['INTERNAL_SERVER_ERROR', 500, true],
    ['INTERNAL_SERVER_ERROR', 503, true],
    ['UNAUTHENTICATED', 401, false],
    ['FORBIDDEN', 403, false],
    ['TOO_MANY_REQUESTS', 429, false],
  ] as const)('%s·%d → %s', (classification, status, expected) => {
    expect(isTransientError(new ApiError('x', classification, null, status))).toBe(expected);
  });

  it('반증: ApiError가 아니면 장애로 보지 않는다', () => {
    expect(isTransientError(new Error('boom'))).toBe(false);
  });
});

describe('messageFor', () => {
  it('표에 있는 코드는 한국어 문구로 바꾼다', () => {
    const e = new ApiError('Invalid credentials', 'UNAUTHENTICATED', 'INVALID_CREDENTIALS', 401);
    expect(messageFor(e)).toBe('아이디 또는 비밀번호가 올바르지 않습니다.');
    expect(e.isUnauthenticated).toBe(true);
    expect(e.fieldErrors).toBeNull();
  });

  // 판매자 앱에서 추가한 코드 전수 — BE 원문 대신 표 문구가 나가는지
  it.each([
    'ACCOUNT_NOT_ACTIVE',
    'ACCOUNT_TYPE_NOT_ALLOWED',
    'LOGIN_RATE_LIMITED',
    'CURRENT_PASSWORD_INVALID',
    'PASSWORD_CHANGE_REQUIRED',
    'STORE_NOT_FOUND',
    'INVALID_PUSH_TOKEN',
    'PRODUCT_TAG_LIMIT_EXCEEDED',
    'TEXT_TOO_LONG',
    'INVALID_DATE',
  ])('%s는 표 문구를 쓴다', (code) => {
    const e = new ApiError('BE 원문', 'BAD_USER_INPUT', code, 400);
    expect(messageFor(e)).toBe(MESSAGES[code]);
    expect(messageFor(e)).not.toBe('BE 원문');
    expect(messageFor(e)).toMatch(/[가-힣]/);
  });

  it('표에 없는 코드는 BE 메시지를 그대로 쓴다', () => {
    expect(
      messageFor(new ApiError('이미 등록된 태그입니다.', 'CONFLICT', 'TAG_ALREADY_EXISTS', 409)),
    ).toBe('이미 등록된 태그입니다.');
  });

  // classification은 전부 INTERNAL_SERVER_ERROR로 두어, 분류가 아닌 code·status로 판단하는지 본다.
  it.each([
    ['INTERNAL_ERROR', 500],
    [null, 500],
    [null, 502],
  ] as const)('code %s·%d는 서버 원문을 고정 문구로 가린다', (code, status) => {
    const e = new ApiError(
      'Invalid `prisma.store.findMany()` invocation',
      'INTERNAL_SERVER_ERROR',
      code,
      status,
    );
    expect(messageFor(e)).toBe('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  });

  it.each([
    ['S3_PRESIGN_FAILED', 500],
    ['VALIDATION_FAILED', 400],
    [null, 400],
    [null, 429],
  ] as const)('code %s·%d는 BE 문구를 그대로 쓴다', (code, status) => {
    const e = new ApiError('BE 문구', 'INTERNAL_SERVER_ERROR', code, status);
    expect(messageFor(e)).toBe('BE 문구');
  });

  it('네트워크 오류와 알 수 없는 오류는 고정 문구다', () => {
    expect(messageFor(new ApiError('x', 'NETWORK', null, 0))).toBe('서버에 연결할 수 없습니다.');
    expect(messageFor(new Error('boom'))).toBe('알 수 없는 오류가 발생했습니다.');
  });
});
