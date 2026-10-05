import { z } from 'zod';

import { formatNumber } from './format';

type ErrorMap = NonNullable<Parameters<typeof z.config>[0]>['customError'];
type Issue = Parameters<NonNullable<ErrorMap>>[0];

const n = (v: number | bigint) => formatNumber(Number(v));

function tooBig(issue: Extract<Issue, { code: 'too_big' }>): string {
  const max = issue.maximum;
  switch (issue.origin) {
    case 'string':
      return `${n(max)}자 이하로 입력해 주세요.`;
    case 'array':
    case 'set':
      return `${n(max)}개 이하로 선택해 주세요.`;
    case 'number':
    case 'int':
    case 'bigint':
      return issue.inclusive
        ? `${n(max)} 이하로 입력해 주세요.`
        : `${n(max)}보다 작은 값을 입력해 주세요.`;
    default:
      return '입력한 값이 너무 큽니다.';
  }
}

function tooSmall(issue: Extract<Issue, { code: 'too_small' }>): string {
  const min = issue.minimum;
  switch (issue.origin) {
    case 'string':
      return Number(min) <= 1 ? '값을 입력해 주세요.' : `${n(min)}자 이상 입력해 주세요.`;
    case 'array':
    case 'set':
      return Number(min) <= 1 ? '하나 이상 선택해 주세요.' : `${n(min)}개 이상 선택해 주세요.`;
    case 'number':
    case 'int':
    case 'bigint':
      return issue.inclusive
        ? `${n(min)} 이상으로 입력해 주세요.`
        : `${n(min)}보다 큰 값을 입력해 주세요.`;
    default:
      return '입력한 값이 너무 작습니다.';
  }
}

function invalidType(issue: Extract<Issue, { code: 'invalid_type' }>): string {
  if (issue.input === undefined || issue.input === null) return '값을 입력해 주세요.';
  switch (issue.expected) {
    case 'number':
    case 'bigint':
      return '숫자를 입력해 주세요.';
    case 'int':
      return '정수를 입력해 주세요.';
    case 'date':
      return '올바른 날짜를 입력해 주세요.';
    default:
      return '입력 형식이 올바르지 않습니다.';
  }
}

const FORMAT_MESSAGES: Partial<Record<string, string>> = {
  email: '올바른 이메일 주소를 입력해 주세요.',
  url: '올바른 웹 주소를 입력해 주세요.',
  date: '올바른 날짜를 입력해 주세요.',
  datetime: '올바른 날짜와 시간을 입력해 주세요.',
  time: '올바른 시간을 입력해 주세요.',
};

/**
 * 메시지를 따로 주지 않은 규칙의 한국어 문구. zod 기본 한국어 로캘은 'string이 너무 큽니다'처럼
 * 타입 이름이 드러나서, 폼에서 자주 걸리는 규칙은 존댓말 문장으로 바꾸고 나머지는 로캘에 맡긴다.
 * 스키마에 적은 메시지가 항상 우선한다.
 */
const koreanErrorMap: NonNullable<ErrorMap> = (issue) => {
  switch (issue.code) {
    case 'too_big':
      return tooBig(issue);
    case 'too_small':
      return tooSmall(issue);
    case 'invalid_type':
      return invalidType(issue);
    case 'invalid_format':
      return FORMAT_MESSAGES[issue.format] ?? '입력 형식이 올바르지 않습니다.';
    case 'invalid_value':
      return '보기 중에서 선택해 주세요.';
    case 'not_multiple_of':
      return `${n(issue.divisor)}의 배수로 입력해 주세요.`;
    default:
      return undefined;
  }
};

/** 앱 부팅 때 한 번 부른다. zod 설정은 전역이라 테스트 setup에서도 같은 설정을 쓴다. */
export function installZodKorean() {
  z.config(z.locales.ko());
  z.config({ customError: koreanErrorMap });
}
