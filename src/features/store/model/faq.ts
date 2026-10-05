import { type Document, isDomElement, isDomText, TRenderEngine } from '@native-html/render';

type Node = Document['children'][number];

export const FAQ_TITLE_MAX = 120;
export const BULLET = '• ';

export const FAQ_COPY = {
  hint: '구매자가 채팅을 시작하면 활성 항목이 순서대로 자동 응답돼요. 왼쪽 핸들을 길게 눌러 순서를 바꿀 수 있어요.',
  emptyTitle: '자동응답 항목이 없어요',
  emptyDescription: '자주 받는 질문을 등록하면 채팅 시작 때 자동으로 답해요',
  activeHint: '끄면 목록에만 남고 자동 응답되지 않아요',
  answerPlaceholder: '구매자에게 보낼 답변을 입력하세요',
  previewEmpty: '답변을 입력하면 채팅에 보이는 모습이 여기에 나와요',
  deleteTitle: '이 항목을 삭제할까요?',
  deleteDescription: '삭제하면 자동 응답에서도 빠져요',
  saved: '저장되었습니다',
  deleted: '항목을 삭제했어요',
  orderSaved: '순서를 저장했어요',
  notFound: '삭제되었거나 찾을 수 없는 항목이에요',
  titleRequired: '제목을 입력해 주세요',
  titleTooLong: `제목은 ${FAQ_TITLE_MAX}자까지 입력할 수 있어요`,
  answerRequired: '답변을 입력해 주세요',
} as const;

export interface Selection {
  start: number;
  end: number;
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** 이스케이프 뒤에 서식을 입히므로 사용자가 친 태그는 글자로 남는다 */
function inline(line: string): string {
  return escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}">${url}</a>`);
}

interface Block {
  kind: 'p' | 'ul' | 'ol';
  lines: string[];
}

/**
 * 편집 글 → 답변 HTML. '**굵게**' → strong, '• '·'- ' 줄 → ul, '1. ' 줄 → ol,
 * 빈 줄은 문단 구분, 문단 안 줄바꿈은 br, http(s) 주소는 링크
 */
export function textToHtml(text: string): string {
  const blocks: Block[] = [];
  let paragraphBreak = true;
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      paragraphBreak = true;
      continue;
    }
    const bullet = /^[•-]\s+(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    const kind = bullet ? 'ul' : ordered ? 'ol' : 'p';
    const content = bullet?.[1] ?? ordered?.[1] ?? line;
    const last = blocks.at(-1);
    if (!paragraphBreak && last?.kind === kind) last.lines.push(content);
    else blocks.push({ kind, lines: [content] });
    paragraphBreak = false;
  }
  return blocks
    .map(({ kind, lines }) =>
      kind === 'p'
        ? `<p>${lines.map(inline).join('<br>')}</p>`
        : `<${kind}>${lines.map((l) => `<li>${inline(l)}</li>`).join('')}</${kind}>`,
    )
    .join('');
}

const SKIPPED = new Set(['script', 'style', 'head', 'title', 'template', 'noscript']);
let engine: TRenderEngine | null = null;

function toText(node: Node): string {
  if (isDomText(node)) return node.data.replace(/\s+/g, ' ');
  if (!isDomElement(node)) return '';
  const name = node.name.toLowerCase();
  if (SKIPPED.has(name)) return '';
  if (name === 'br') return '\n';
  if (name === 'ul' || name === 'ol') {
    const items = node.children
      .filter((c) => isDomElement(c) && c.name.toLowerCase() === 'li')
      .map((li, i) => `${name === 'ol' ? `${i + 1}. ` : BULLET}${toText(li).trim()}`);
    return `\n\n${items.join('\n')}\n\n`;
  }
  const inner = node.children.map(toText).join('');
  if (name === 'strong' || name === 'b') return inner.trim() ? `**${inner}**` : inner;
  if (name === 'a') {
    const href = node.attribs.href?.trim();
    return href && inner.trim() !== href ? `${inner} (${href})` : inner;
  }
  if (name === 'p' || name === 'div') return `\n\n${inner}\n\n`;
  return inner;
}

const isItem = (line = '') => line.startsWith(BULLET) || /^\d+\. /.test(line);

/** 저장된 답변 HTML → 편집 글(textToHtml의 역). 서식 밖 태그는 글자만 남긴다 */
export function htmlToText(html: string): string {
  engine ??= new TRenderEngine();
  const lines = engine
    .parseDocument(html)
    .children.map(toText)
    .join('')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n');
  // 목록 앞뒤 빈 줄은 없어도 블록이 갈린다 — 편집 글에서는 붙여 쓴다
  return lines
    .filter((l, i) => l || !(isItem(lines[i - 1]) || isItem(lines[i + 1])))
    .join('\n')
    .trim();
}

/** 선택 영역을 '**'로 감싼다. 이미 감싸져 있으면 벗긴다 */
export function toggleBold(text: string, { start, end }: Selection) {
  if (text.slice(start - 2, start) === '**' && text.slice(end, end + 2) === '**') {
    return {
      text: text.slice(0, start - 2) + text.slice(start, end) + text.slice(end + 2),
      selection: { start: start - 2, end: end - 2 },
    };
  }
  return {
    text: `${text.slice(0, start)}**${text.slice(start, end)}**${text.slice(end)}`,
    selection: { start: start + 2, end: end + 2 },
  };
}

/** 선택이 걸친 줄마다 '• '를 붙인다. 전부 붙어 있으면 뗀다 */
export function toggleList(text: string, { start, end }: Selection) {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const found = text.indexOf('\n', end);
  const lineEnd = found === -1 ? text.length : found;
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const all = lines.every((l) => l.startsWith(BULLET));
  const block = lines
    .map((l) => (all ? l.slice(BULLET.length) : l.startsWith(BULLET) ? l : BULLET + l))
    .join('\n');
  const caret = lineStart + block.length;
  return {
    text: text.slice(0, lineStart) + block + text.slice(lineEnd),
    selection: { start: caret, end: caret },
  };
}

/** 한 칸 위(-1)·아래(+1)로. 끝을 넘으면 그대로 */
export function moveId(ids: readonly string[], id: string, delta: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/** 화면 순서를 sortOrder 0,1,2…로 맞출 때 실제로 바뀌는 항목만 */
export function sortOrderUpdates(
  topics: readonly { id: string; sortOrder: number }[],
  orderedIds: readonly string[],
): { topicId: string; sortOrder: number }[] {
  const current = new Map(topics.map((t) => [t.id, t.sortOrder]));
  return orderedIds.flatMap((id, index) =>
    current.has(id) && current.get(id) !== index ? [{ topicId: id, sortOrder: index }] : [],
  );
}

/** 새 항목은 맨 뒤로 */
export const nextSortOrder = (topics: readonly { sortOrder: number }[]) =>
  topics.reduce((max, t) => Math.max(max, t.sortOrder + 1), 0);

export function validateFaq(title: string, answer: string) {
  const t = title.trim();
  return {
    title: !t
      ? FAQ_COPY.titleRequired
      : [...t].length > FAQ_TITLE_MAX
        ? FAQ_COPY.titleTooLong
        : null,
    answer: answer.trim() ? null : FAQ_COPY.answerRequired,
  };
}
