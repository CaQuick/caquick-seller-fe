import {
  type Document,
  type Element,
  TRenderEngine,
  isDomElement,
  isDomText,
} from '@native-html/render';

type Child = Document['children'][number];

/** FAQ 답변 서식 범위. 서버가 sanitize하지 않아 앱이 허용 목록으로 거른다 */
const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a']);
/** 내용째 버리는 태그. 그 밖의 허용 밖 태그는 껍데기만 벗기고 글자는 남긴다 */
const DROPPED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'head',
  'title',
  'svg',
  'math',
  'textarea',
  'select',
]);

let engine: TRenderEngine | null = null;

export function safeHref(href: string | undefined): string | null {
  const url = href?.trim();
  return url && /^https?:\/\//i.test(url) ? url : null;
}

function setChildren(parent: Element | Document, children: Child[]) {
  parent.children = children;
  children.forEach((child, i) => {
    child.parent = parent;
    child.prev = children[i - 1] ?? null;
    child.next = children[i + 1] ?? null;
  });
}

function clean(node: Child): Child[] {
  if (isDomText(node)) return [node];
  if (!isDomElement(node)) return [];
  const name = node.name.toLowerCase();
  if (DROPPED_TAGS.has(name)) return [];
  const children = node.children.flatMap(clean);
  const href = name === 'a' ? safeHref(node.attribs.href) : null;
  if (!ALLOWED_TAGS.has(name) || (name === 'a' && !href)) return children;
  // on* 핸들러·style·class를 포함한 속성은 전부 버리고 링크 주소만 남긴다
  node.attribs = href ? { href } : {};
  setChildren(node, children);
  return [node];
}

/** HTML 본문 → 허용 태그만 남긴 DOM. RenderHTML에 source={{ dom }}으로 넘긴다 */
export function sanitizeHtml(html: string): Document {
  engine ??= new TRenderEngine();
  const doc = engine.parseDocument(html);
  setChildren(doc, doc.children.flatMap(clean));
  return doc;
}
