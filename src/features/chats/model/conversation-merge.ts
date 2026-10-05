import { type Conversation, type ConversationPages } from '../api/conversations';

export interface ConversationUpdate {
  conversationId: string;
  accountId: string;
  buyerNickname?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt: string;
  sellerLastReadAt?: string | null;
  unreadCount: number;
}

interface Mark {
  lastMessageAt?: string | null;
  sellerLastReadAt?: string | null;
}

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : -Infinity);
// -Infinity끼리 빼면 NaN이라 뺄셈 대신 비교한다
const cmp = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);

/** (lastMessageAt, sellerLastReadAt) 사전식 비교. 이벤트 도착 순서가 보장되지 않아 이 값으로 오래된 것을 버린다 */
export function compareMark(a: Mark, b: Mark): number {
  return (
    cmp(time(a.lastMessageAt), time(b.lastMessageAt)) ||
    cmp(time(a.sellerLastReadAt), time(b.sellerLastReadAt))
  );
}

const laterOf = (a?: string | null, b?: string | null) => (time(a) >= time(b) ? a : b) ?? null;

function findItem(data: ConversationPages, id: string): Conversation | undefined {
  for (const page of data.pages) {
    const hit = page.items.find((c) => c.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export interface MergeResult {
  data: ConversationPages;
  /** 버리지 않고 반영했으면 반영된 항목 */
  applied: Conversation | null;
  previous: Conversation | undefined;
}

/**
 * 구독 이벤트를 목록 캐시에 합친다. 표시 중인 상태보다 오래됐거나 같으면 버린다.
 * 읽음 mutation은 이벤트를 내지 않으므로, 로컬 읽음 시각이 이벤트의 마지막 메시지 이후면 미읽음을 0으로 본다.
 * 반영된 대화는 맨 위로 올린다(목록은 최근 갱신순).
 */
export function mergeConversationUpdate(
  data: ConversationPages,
  event: ConversationUpdate,
): MergeResult {
  const previous = findItem(data, event.conversationId);
  if (previous && compareMark(event, previous) <= 0) return { data, applied: null, previous };
  const readAll = time(previous?.sellerLastReadAt) >= time(event.lastMessageAt);
  const applied: Conversation = {
    ...previous,
    id: event.conversationId,
    accountId: event.accountId,
    buyerNickname: event.buyerNickname ?? previous?.buyerNickname ?? null,
    lastMessagePreview: event.lastMessagePreview ?? null,
    lastMessageAt: event.lastMessageAt,
    sellerLastReadAt: laterOf(previous?.sellerLastReadAt, event.sellerLastReadAt),
    unreadCount: readAll ? 0 : event.unreadCount,
    updatedAt: event.lastMessageAt,
  };
  const pages = data.pages.map((page, i) => {
    const rest = page.items.filter((c) => c.id !== event.conversationId);
    return {
      ...page,
      items: i === 0 ? [applied, ...rest] : rest,
      totalCount: i === 0 && !previous ? page.totalCount + 1 : page.totalCount,
    };
  });
  return { data: { ...data, pages }, applied, previous };
}

/**
 * 읽음 처리 응답(서버 상태)을 제자리에 반영한다. 읽음은 정렬 기준(updated_at)을 바꾸지 않는다.
 * 요청 사이에 더 새 메시지가 도착했으면 읽음 시각만 당기고 미읽음 수는 둔다.
 */
export function applyReadState(data: ConversationPages, read: Conversation): ConversationPages {
  const current = findItem(data, read.id);
  if (!current) return data;
  const next: Conversation =
    compareMark(read, current) >= 0
      ? { ...current, ...read, updatedAt: current.updatedAt }
      : { ...current, sellerLastReadAt: laterOf(current.sellerLastReadAt, read.sellerLastReadAt) };
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((c) => (c.id === read.id ? next : c)),
    })),
  };
}

export function findConversation(
  data: ConversationPages | undefined,
  id: string,
): Conversation | undefined {
  return data ? findItem(data, id) : undefined;
}

/** '답변 필요'(P1): 판매자가 아직 안 읽은 구매자 메시지가 1건 이상 */
export const needsReply = (c: Pick<Conversation, 'unreadCount'>) => c.unreadCount > 0;
