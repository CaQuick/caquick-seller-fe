export type ErrorClassification =
  | 'BAD_USER_INPUT'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'
  | 'NETWORK';

/** 403 중 세션 상태를 바꿔야 하는 코드 — 요청 계층이 onForbidden 훅으로 auth에 넘긴다. */
export const FORBIDDEN_CODES = [
  'PASSWORD_CHANGE_REQUIRED',
  'ACCOUNT_NOT_ACTIVE',
  'ACCOUNT_TYPE_NOT_ALLOWED',
] as const;
export type ForbiddenCode = (typeof FORBIDDEN_CODES)[number];

export function isForbiddenCode(code: string | null): code is ForbiddenCode {
  return (FORBIDDEN_CODES as readonly string[]).includes(code ?? '');
}

/** 필드 이름 → 첫 번째 위반 문구. REST 400 validation의 data[]에서 만든다. */
export type FieldErrors = Record<string, string>;

/** GraphQL·REST 공통 에러. code는 BE 에러 카탈로그 코드(예 STORE_NOT_FOUND), 없으면 null. */
export class ApiError extends Error {
  readonly classification: ErrorClassification;
  readonly code: string | null;
  readonly status: number;
  readonly fieldErrors: FieldErrors | null;

  constructor(
    message: string,
    classification: ErrorClassification,
    code: string | null,
    status: number,
    fieldErrors: FieldErrors | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.classification = classification;
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isUnauthenticated(): boolean {
    return this.classification === 'UNAUTHENTICATED';
  }
}

export function classifyStatus(status: number): ErrorClassification {
  if (status === 400 || status === 422) return 'BAD_USER_INPUT';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'TOO_MANY_REQUESTS';
  return 'INTERNAL_SERVER_ERROR';
}

const INTERNAL_MESSAGE = '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

/** 카탈로그 코드 → 화면 문구. 표에 없으면 BE message를 그대로 쓴다. */
export const MESSAGES: Record<string, string> = {
  // INTERNAL_ERROR의 message는 서버 내부 원문(Prisma 등)일 수 있다.
  INTERNAL_ERROR: INTERNAL_MESSAGE,
  AUTHENTICATION_REQUIRED: '로그인이 필요합니다.',
  INVALID_ACCESS_TOKEN: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  SESSION_ACCOUNT_MISSING: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  INVALID_CREDENTIALS: '아이디 또는 비밀번호가 올바르지 않습니다.',
  MISSING_REFRESH_TOKEN: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  INVALID_REFRESH_TOKEN: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  PASSWORD_CHANGE_REQUIRED: '비밀번호를 변경한 뒤 이용할 수 있습니다.',
  ACCOUNT_NOT_ACTIVE: '이용이 정지된 계정입니다.',
  ACCOUNT_TYPE_NOT_ALLOWED: '판매자 계정만 이용할 수 있습니다.',
  LOGIN_RATE_LIMITED: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  STORE_NOT_FOUND: '매장 정보를 찾을 수 없습니다.',
  INVALID_PUSH_TOKEN: '알림 등록에 실패했습니다. 앱을 다시 실행해 주세요.',
  PRODUCT_TAG_LIMIT_EXCEEDED: '태그는 상품당 20개까지 등록할 수 있습니다.',
  TEXT_TOO_LONG: '입력한 내용이 너무 깁니다.',
  INVALID_DATE: '날짜 형식이 올바르지 않습니다.',
};

export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    const known = error.code ? MESSAGES[error.code] : undefined;
    if (known) return known;
    if (error.classification === 'NETWORK') return '서버에 연결할 수 없습니다.';
    // 코드 없는 5xx는 서버 원문뿐이다. 코드 있는 5xx(S3_PRESIGN_FAILED 등)는 사용자용 문구라 그대로 둔다.
    if (error.code === null && error.status >= 500) return INTERNAL_MESSAGE;
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
}
