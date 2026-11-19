import {
  type OrderActorType,
  type SellerUpsertSettlementAccountInput,
} from '@/graphql/generated/graphql';
import { ApiError, messageFor } from '@/shared/api';
import { enumView } from '@/shared/lib/enum-view';

/** BE 예금주 상한(코드 포인트). TextField maxLength는 UTF-16 단위라 이보다 넘칠 수 없다 */
export const ACCOUNT_HOLDER_MAX = 50;
const ACCOUNT_DIGITS = /^\d{8,20}$/;

export const ACCOUNT_COPY = {
  numberHint: '하이픈 없이 숫자 8~20자리',
  numberError: '계좌번호는 숫자 8~20자리로 입력해 주세요.',
  missing: '정산 계좌를 등록해야 주간 정산 금액을 받을 수 있어요.',
  byAdmin: '케이퀵 관리자가 대신 바꾼 계좌예요. 요청한 적이 없다면 케이퀵에 문의해 주세요.',
  saved: '정산 계좌를 저장했어요',
} as const;

export interface AccountForm {
  bank: { code: string; name: string } | null;
  accountNumber: string;
  accountHolder: string;
}

export const EMPTY_ACCOUNT_FORM: AccountForm = {
  bank: null,
  accountNumber: '',
  accountHolder: '',
};

/** 붙여 넣은 '123-45-678 90'도 받도록 하이픈·공백을 뺀다. BE는 하이픈을 뺀 숫자만 저장한다 */
export const normalizeAccountNumber = (raw: string) => raw.replace(/[\s-]/g, '');

/** 입력이 맞으면 저장 입력, 아니면 null. 숫자 아닌 글자·20자리 초과는 입력 중에도 오류로 보인다 */
export function checkAccountForm(form: AccountForm): {
  input: SellerUpsertSettlementAccountInput | null;
  numberError: string | null;
} {
  const { bank } = form;
  const digits = normalizeAccountNumber(form.accountNumber);
  const holder = form.accountHolder.trim();
  const numberError = /\D/.test(digits) || digits.length > 20 ? ACCOUNT_COPY.numberError : null;
  const valid = bank !== null && ACCOUNT_DIGITS.test(digits) && holder.length > 0;
  return {
    input: valid ? { bankCode: bank.code, accountNumber: digits, accountHolder: holder } : null,
    numberError,
  };
}

export const updatedByLabel = enumView(
  {
    BUYER: '구매자',
    SELLER: '매장',
    ADMIN: '케이퀵 관리자',
    SYSTEM: '시스템',
  } satisfies Record<OrderActorType, string>,
  '기타',
);

/** 매장 탭 메뉴 보조 문구 */
export function accountSummary(
  account: { bank: { name: string }; accountNumberMasked: string } | null,
): string {
  return account ? `${account.bank.name} ${account.accountNumberMasked}` : '등록이 필요해요';
}

const ACCOUNT_ERRORS: Record<string, string> = {
  INVALID_BANK_CODE: '은행을 다시 골라 주세요.',
  INVALID_ACCOUNT_NUMBER: ACCOUNT_COPY.numberError,
  TEXT_REQUIRED: '예금주를 입력해 주세요.',
  TEXT_TOO_LONG: `예금주는 ${ACCOUNT_HOLDER_MAX}자 이내로 입력해 주세요.`,
};

export function accountErrorMessage(error: unknown): string {
  const known = error instanceof ApiError && error.code ? ACCOUNT_ERRORS[error.code] : undefined;
  return known ?? messageFor(error);
}
