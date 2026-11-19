import { ApiError } from '@/shared/api';
import { enumValues } from '@/test/generated-enums';

import {
  ACCOUNT_COPY,
  accountErrorMessage,
  type AccountForm,
  accountSummary,
  checkAccountForm,
  normalizeAccountNumber,
  updatedByLabel,
} from './settlement-account';

const KB = { code: '004', name: 'KB국민은행' };
const form = (patch: Partial<AccountForm> = {}): AccountForm => ({
  bank: KB,
  accountNumber: '12345678',
  accountHolder: '해즈 케이크',
  ...patch,
});

describe('normalizeAccountNumber', () => {
  it.each([
    ['123-456-78901', '12345678901'],
    ['  1234 5678 90 ', '1234567890'],
    ['1234\t5678', '12345678'],
    ['12a34', '12a34'],
    ['', ''],
  ])('%j → %j', (raw, expected) => {
    expect(normalizeAccountNumber(raw)).toBe(expected);
  });
});

describe('checkAccountForm', () => {
  it.each<[string, Partial<AccountForm>, string | null]>([
    ['8자리', { accountNumber: '12345678' }, '12345678'],
    ['20자리', { accountNumber: '1'.repeat(20) }, '1'.repeat(20)],
    ['하이픈·공백은 빼고 보낸다', { accountNumber: '110-123 456789' }, '110123456789'],
    ['반증: 7자리', { accountNumber: '1234567' }, null],
    ['반증: 21자리', { accountNumber: '1'.repeat(21) }, null],
    ['반증: 숫자 아닌 글자', { accountNumber: '1234567a' }, null],
    ['반증: 은행 미선택', { bank: null }, null],
    ['반증: 예금주 공백만', { accountHolder: '   ' }, null],
  ])('%s', (_, patch, digits) => {
    const { input } = checkAccountForm(form(patch));
    expect(input?.accountNumber ?? null).toBe(digits);
  });

  it('예금주는 앞뒤 공백을 빼고, 은행은 코드로 보낸다', () => {
    expect(checkAccountForm(form({ accountHolder: '  김다은 ' })).input).toEqual({
      bankCode: '004',
      accountNumber: '12345678',
      accountHolder: '김다은',
    });
  });

  // 8자리를 채우기 전에는 오류로 보이지 않고 저장만 막는다
  it.each([
    ['', null],
    ['1234', null],
    ['1'.repeat(20), null],
    ['1'.repeat(21), ACCOUNT_COPY.numberError],
    ['12.34', ACCOUNT_COPY.numberError],
  ])('계좌번호 %j 입력 중 오류 %j', (accountNumber, error) => {
    expect(checkAccountForm(form({ accountNumber })).numberError).toBe(error);
  });
});

describe('updatedByLabel', () => {
  const table: Record<string, string> = {
    BUYER: '구매자',
    SELLER: '매장',
    ADMIN: '케이퀵 관리자',
    SYSTEM: '시스템',
  };

  it('표가 생성 enum 값 전부를 덮는다', () => {
    expect(Object.keys(table).sort()).toEqual([...enumValues('OrderActorType')].sort());
  });

  it.each([...Object.entries(table), ['NEW_ACTOR', '기타'], ['toString', '기타']])(
    '%s → %s',
    (role, label) => {
      expect(updatedByLabel(role)).toBe(label);
    },
  );
});

describe('accountSummary', () => {
  it('등록된 계좌는 은행과 끝 4자리, 없으면 등록 필요', () => {
    expect(accountSummary({ bank: KB, accountNumberMasked: '****5678' })).toBe(
      'KB국민은행 ****5678',
    );
    expect(accountSummary(null)).toBe('등록이 필요해요');
  });
});

describe('accountErrorMessage', () => {
  const err = (code: string | null) => new ApiError('서버 문구', 'BAD_USER_INPUT', code, 400);
  it.each([
    ['INVALID_BANK_CODE', '은행을 다시 골라 주세요.'],
    ['INVALID_ACCOUNT_NUMBER', ACCOUNT_COPY.numberError],
    ['TEXT_REQUIRED', '예금주를 입력해 주세요.'],
    ['TEXT_TOO_LONG', '예금주는 50자 이내로 입력해 주세요.'],
    ['OTHER_CODE', '서버 문구'],
  ])('%s → %s', (code, message) => {
    expect(accountErrorMessage(err(code))).toBe(message);
  });

  it('코드 없는 오류는 공용 문구로', () => {
    expect(accountErrorMessage(err(null))).toBe('서버 문구');
    expect(accountErrorMessage(new Error('x'))).toBe('알 수 없는 오류가 발생했습니다.');
  });
});
