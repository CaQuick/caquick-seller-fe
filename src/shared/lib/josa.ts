export type JosaPair = '을/를' | '이/가' | '은/는' | '와/과' | '으로/로';

/** [받침 있을 때, 받침 없을 때, 판별 불가일 때] */
const FORMS: Record<JosaPair, readonly [string, string, string]> = {
  '을/를': ['을', '를', '을(를)'],
  '이/가': ['이', '가', '이(가)'],
  '은/는': ['은', '는', '은(는)'],
  '와/과': ['과', '와', '와(과)'],
  '으로/로': ['으로', '로', '(으)로'],
};

type Final = 'none' | 'rieul' | 'other';

const RIEUL = 8;

/** 영문 한 글자를 알파벳 이름으로 읽을 때의 끝소리. 엘·알은 ㄹ, 엠·엔은 받침, 나머지는 받침 없음. */
const LETTER_FINAL: Partial<Record<string, Final>> = {
  L: 'rieul',
  R: 'rieul',
  M: 'other',
  N: 'other',
};

/** 숫자 끝자리를 읽을 때의 끝소리(영·일·이·삼·사·오·육·칠·팔·구). */
const DIGIT_FINAL: readonly Final[] = [
  'other',
  'rieul',
  'none',
  'other',
  'none',
  'none',
  'other',
  'rieul',
  'rieul',
  'none',
];

/** 끝에 0이 붙은 수는 자리 이름(십·백·천·만·억·조)으로 끝나고, 모두 받침이 있다. 조를 넘으면 판별하지 않는다. */
const MAX_PLACE_ZEROS = 15;

// 뒤에 붙은 닫는 괄호·따옴표·공백은 읽지 않는다: '케이크(강남점)'은 '점'으로 판별
const TRAILING_SKIP = /[\s)\]}"'”’」』》〉>]+$/u;

function finalSound(word: string): Final | undefined {
  const text = word.replace(TRAILING_SKIP, '');
  const last = text.at(-1);
  if (last === undefined) return undefined;

  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    if (jong === 0) return 'none';
    return jong === RIEUL ? 'rieul' : 'other';
  }

  const number = /(\d[\d,]*)(\.\d+)?$/.exec(text);
  if (number) {
    const [, integer = '', fraction] = number;
    // 소수점 아래는 한 자리씩 읽는다(1.50 → 일 점 오 영)
    if (fraction) return DIGIT_FINAL[Number(fraction.at(-1))];
    const digits = integer.replaceAll(',', '');
    const zeros = digits.length - digits.replace(/0+$/, '').length;
    if (zeros === digits.length) return DIGIT_FINAL[0]; // 영
    if (zeros === 0) return DIGIT_FINAL[Number(digits.at(-1))];
    return zeros <= MAX_PLACE_ZEROS ? 'other' : undefined;
  }

  // 영문은 알파벳 이름으로 읽히는 경우(한 글자, 모음 없는 대문자 약어)만 판별한다. 단어(cake, LAB)는 발음을 알 수 없다.
  const latin = /[A-Za-z]+$/.exec(text)?.[0];
  if (latin && (latin.length === 1 || /^[B-DF-HJ-NP-TV-XZ]+$/.test(latin))) {
    return LETTER_FINAL[latin.at(-1)!.toUpperCase()] ?? 'none';
  }
  return undefined;
}

/** 단어의 끝소리에 맞는 조사를 붙인다. 판별할 수 없으면 '을(를)'처럼 두 형태를 함께 쓴다. */
export function josa(word: string, pair: JosaPair): string {
  const [withFinal, withoutFinal, unknown] = FORMS[pair];
  const final = finalSound(word);
  if (final === undefined) return unknown;
  if (pair === '으로/로') return final === 'other' ? withFinal : withoutFinal;
  return final === 'none' ? withoutFinal : withFinal;
}

/** `withJosa('리뷰', '을/를')` → '리뷰를' */
export function withJosa(word: string, pair: JosaPair): string {
  return `${word}${josa(word, pair)}`;
}
