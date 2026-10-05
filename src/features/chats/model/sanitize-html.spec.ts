import { type Document, isDomElement, isDomText } from '@native-html/render';

import { safeHref, sanitizeHtml } from './sanitize-html';

type Child = Document['children'][number];

/** 단언용 직렬화(속성 포함). 라이브러리 직렬화는 jest에서 엔티티 처리가 빠져 쓰지 않는다 */
function serialize(node: Child | Document): string {
  if (isDomText(node)) return node.data;
  if (!('children' in node)) return '';
  const inner = node.children.map(serialize).join('');
  if (!isDomElement(node)) return inner;
  const attrs = Object.entries(node.attribs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');
  return `<${node.name}${attrs}>${inner}</${node.name}>`;
}

const clean = (html: string) => serialize(sanitizeHtml(html));

describe('sanitizeHtml', () => {
  it('허용 태그는 남긴다', () => {
    expect(
      clean('<p><strong>a</strong><em>b</em><br/></p><ul><li>c</li></ul><ol><li>d</li></ol>'),
    ).toBe('<p><strong>a</strong><em>b</em><br></br></p><ul><li>c</li></ul><ol><li>d</li></ol>');
  });

  it('반증: script·style·iframe은 내용째 지운다', () => {
    expect(
      clean(
        '<p>안녕</p><script>alert(1)</script><style>p{}</style><iframe src="https://x">y</iframe>',
      ),
    ).toBe('<p>안녕</p>');
  });

  it('반증: on* 핸들러·style·class 속성을 지운다', () => {
    expect(clean('<p onclick="steal()" onMouseOver="x" style="color:red" class="c">본문</p>')).toBe(
      '<p>본문</p>',
    );
  });

  it('허용 밖 태그는 껍데기만 벗기고 글자는 남긴다', () => {
    expect(clean('<div><span>가</span><img src="https://x/a.png">나<!-- 주석 --></div>')).toBe(
      '가나',
    );
  });

  it.each([
    [
      'https',
      '<a href="https://caquick.site/a" target="_blank">링크</a>',
      '<a href="https://caquick.site/a">링크</a>',
    ],
    ['http', '<a href=" http://caquick.site ">링크</a>', '<a href="http://caquick.site">링크</a>'],
    ['javascript:', '<a href="javascript:alert(1)">링크</a>', '링크'],
    ['data:', '<a href="data:text/html,x">링크</a>', '링크'],
    ['tel:', '<a href="tel:0101234">링크</a>', '링크'],
    ['주소 없음', '<a>링크</a>', '링크'],
  ])('반증: 링크는 http/https만 남긴다(%s)', (_, html, expected) => {
    expect(clean(html)).toBe(expected);
  });
});

it.each([
  ['https://a.b', 'https://a.b'],
  ['HTTP://A.B', 'HTTP://A.B'],
  ['javascript:alert(1)', null],
  ['//a.b', null],
  [undefined, null],
])('safeHref(%p) → %p', (href, expected) => {
  expect(safeHref(href)).toBe(expected);
});
