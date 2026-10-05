import {
  BULLET,
  htmlToText,
  moveId,
  nextSortOrder,
  sortOrderUpdates,
  textToHtml,
  toggleBold,
  toggleList,
  validateFaq,
} from './faq';

const ALLOWED = new Set(['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a']);
const tagsOf = (html: string) => [...html.matchAll(/<\/?([a-zA-Z0-9]+)/g)].map((m) => m[1]);

describe('textToHtml', () => {
  it.each([
    ['한 줄', '안녕하세요', '<p>안녕하세요</p>'],
    ['문단 안 줄바꿈 → br', '첫 줄\n둘째 줄', '<p>첫 줄<br>둘째 줄</p>'],
    ['빈 줄 → 문단 구분', '가\n\n나', '<p>가</p><p>나</p>'],
    ['굵게', '**픽업 시간**은 30분 단위', '<p><strong>픽업 시간</strong>은 30분 단위</p>'],
    ['• 목록', '• 하루 전\n• 당일 변경', '<ul><li>하루 전</li><li>당일 변경</li></ul>'],
    ['- 목록', '- 하루 전', '<ul><li>하루 전</li></ul>'],
    ['번호 목록', '1. 주문\n2) 픽업', '<ol><li>주문</li><li>픽업</li></ol>'],
    [
      '문단 + 목록 섞기',
      '안내\n• 가\n• 나\n끝',
      '<p>안내</p><ul><li>가</li><li>나</li></ul><p>끝</p>',
    ],
    [
      '주소 → 링크',
      '자세히 https://caquick.site/faq',
      '<p>자세히 <a href="https://caquick.site/faq">https://caquick.site/faq</a></p>',
    ],
    ['CRLF·앞뒤 공백', '  가 \r\n\r\n 나', '<p>가</p><p>나</p>'],
    ['빈 글', '  \n ', ''],
  ])('%s', (_, text, html) => {
    expect(textToHtml(text)).toBe(html);
  });

  it('반증: 사용자가 친 태그·따옴표는 이스케이프돼 글자로 남는다', () => {
    expect(textToHtml('<script>alert("x")</script> & \'y\'')).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;</p>',
    );
  });

  it.each([
    '<img src=x onerror=alert(1)>',
    '<a href="javascript:alert(1)">링크</a>',
    '**<iframe src="https://x">**',
    '• <div style="x">목록</div>\n1. <svg onload=1>',
    'javascript:alert(1) data:text/html,x',
  ])('반증: 어떤 입력도 허용 태그만 만든다 — %s', (text) => {
    const html = textToHtml(text);
    expect(tagsOf(html).every((t) => ALLOWED.has(t ?? ''))).toBe(true);
    expect(html).not.toMatch(/href="(?!https?:)/);
  });
});

describe('htmlToText', () => {
  it.each([
    '안녕하세요',
    '**픽업 시간**은 영업시간 안에서 30분 단위로 고를 수 있어요.\n• 하루 전까지 주문해 주세요\n• 당일 변경은 채팅으로 문의',
    '가\n\n나',
    '첫 줄\n둘째 줄',
    '1. 주문\n2. 픽업',
    '• 가\n끝\n\n다음 문단',
    '자세히 https://caquick.site/faq',
    '<태그> & "따옴표"',
  ])('textToHtml의 역 — %s', (text) => {
    expect(htmlToText(textToHtml(text))).toBe(text);
  });

  it.each([
    ['b·div·span', '<div><b>굵게</b> <span>보통</span></div>', '**굵게** 보통'],
    ['em은 글자만', '<p><em>기울임</em> 끝</p>', '기울임 끝'],
    ['글자와 다른 링크는 주소를 괄호로', '<a href="https://a.b">여기</a>', '여기 (https://a.b)'],
    [
      'script·style 내용은 버린다',
      '<p>안녕</p><script>alert(1)</script><style>p{}</style>',
      '안녕',
    ],
    ['소스 줄바꿈·공백은 한 칸', '<p>\n  가\n  나\n</p>', '가 나'],
    ['빈 굵게는 표시 없이', '<strong> </strong>가', '가'],
  ])('%s', (_, html, text) => {
    expect(htmlToText(html)).toBe(text);
  });
});

describe('toggleBold', () => {
  it('선택 영역을 감싸고 선택을 안쪽으로 옮긴다', () => {
    expect(toggleBold('픽업 시간 안내', { start: 0, end: 5 })).toEqual({
      text: '**픽업 시간** 안내',
      selection: { start: 2, end: 7 },
    });
  });

  it('선택이 없으면 빈 굵게 표시를 넣고 커서를 가운데 둔다', () => {
    expect(toggleBold('가', { start: 1, end: 1 })).toEqual({
      text: '가****',
      selection: { start: 3, end: 3 },
    });
  });

  it('이미 감싼 영역은 벗긴다', () => {
    expect(toggleBold('**굵게**', { start: 2, end: 4 })).toEqual({
      text: '굵게',
      selection: { start: 0, end: 2 },
    });
  });
});

describe('toggleList', () => {
  it('커서가 있는 줄에 표시를 붙인다', () => {
    expect(toggleList('가\n나\n다', { start: 3, end: 3 })).toEqual({
      text: `가\n${BULLET}나\n다`,
      selection: { start: 5, end: 5 },
    });
  });

  it('선택이 걸친 줄마다 붙이고, 이미 붙은 줄은 그대로', () => {
    expect(toggleList(`가\n${BULLET}나`, { start: 0, end: 4 }).text).toBe(
      `${BULLET}가\n${BULLET}나`,
    );
  });

  it('전부 붙어 있으면 뗀다', () => {
    expect(toggleList(`${BULLET}가\n${BULLET}나`, { start: 0, end: 7 }).text).toBe('가\n나');
  });

  it('빈 글에도 붙는다', () => {
    expect(toggleList('', { start: 0, end: 0 })).toEqual({
      text: BULLET,
      selection: { start: 2, end: 2 },
    });
  });
});

describe('순서', () => {
  it.each<[string, -1 | 1, string[]]>([
    ['b', -1, ['b', 'a', 'c']],
    ['b', 1, ['a', 'c', 'b']],
    ['a', -1, ['a', 'b', 'c']],
    ['c', 1, ['a', 'b', 'c']],
    ['x', 1, ['a', 'b', 'c']],
  ])('moveId(%s, %i)', (id, delta, expected) => {
    expect(moveId(['a', 'b', 'c'], id, delta)).toEqual(expected);
  });

  it('바뀐 항목만 sortOrder 0,1,2…로 보낸다', () => {
    const topics = [
      { id: '1', sortOrder: 0 },
      { id: '2', sortOrder: 1 },
      { id: '3', sortOrder: 2 },
    ];
    expect(sortOrderUpdates(topics, ['1', '3', '2'])).toEqual([
      { topicId: '3', sortOrder: 1 },
      { topicId: '2', sortOrder: 2 },
    ]);
    expect(sortOrderUpdates(topics, ['1', '2', '3'])).toEqual([]);
  });

  it('반증: 전부 0(기본값)이면 맨 앞을 뺀 전부를 보낸다', () => {
    const topics = ['1', '2', '3'].map((id) => ({ id, sortOrder: 0 }));
    expect(sortOrderUpdates(topics, ['2', '1', '3'])).toEqual([
      { topicId: '1', sortOrder: 1 },
      { topicId: '3', sortOrder: 2 },
    ]);
  });

  it('목록에 없는 id는 건너뛴다', () => {
    expect(sortOrderUpdates([{ id: '1', sortOrder: 5 }], ['9', '1'])).toEqual([
      { topicId: '1', sortOrder: 1 },
    ]);
  });

  it.each([
    [[], 0],
    [[{ sortOrder: 0 }, { sortOrder: 0 }], 1],
    [[{ sortOrder: 3 }, { sortOrder: 1 }], 4],
  ])('nextSortOrder(%j) → %i', (topics, expected) => {
    expect(nextSortOrder(topics)).toBe(expected);
  });
});

describe('validateFaq', () => {
  it.each([
    ['정상', '픽업 안내', '답', { title: null, answer: null }],
    ['공백 제목', '  ', '답', { title: '제목을 입력해 주세요', answer: null }],
    ['공백 답변', '제목', ' \n', { title: null, answer: '답변을 입력해 주세요' }],
    ['121자', '가'.repeat(121), '답', { title: '제목은 120자까지 입력할 수 있어요', answer: null }],
    ['120자 이모지(코드 포인트)', '🎂'.repeat(120), '답', { title: null, answer: null }],
  ])('%s', (_, title, answer, expected) => {
    expect(validateFaq(title, answer)).toEqual(expected);
  });
});
