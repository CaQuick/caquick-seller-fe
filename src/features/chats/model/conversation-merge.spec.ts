import { type Conversation, type ConversationPages } from '../api/conversations';
import {
  applyReadState,
  compareMark,
  type ConversationUpdate,
  findConversation,
  mergeConversationUpdate,
  needsReply,
} from './conversation-merge';

const T = (min: number) => new Date(Date.UTC(2026, 9, 6, 0, min)).toISOString();

const conv = (id: string, over: Partial<Conversation> = {}): Conversation => ({
  id,
  accountId: `a${id}`,
  buyerNickname: `닉${id}`,
  lastMessagePreview: '이전',
  lastMessageAt: T(10),
  sellerLastReadAt: null,
  unreadCount: 1,
  updatedAt: T(10),
  ...over,
});

const pages = (...lists: Conversation[][]): ConversationPages => ({
  pages: lists.map((items, i) => ({
    items,
    totalCount: 3,
    hasMore: i < lists.length - 1,
    nextCursor: i < lists.length - 1 ? `c${i}` : null,
  })),
  pageParams: lists.map((_, i) => (i === 0 ? null : `c${i - 1}`)),
});

const event = (over: Partial<ConversationUpdate> = {}): ConversationUpdate => ({
  conversationId: '2',
  accountId: 'a2',
  buyerNickname: '닉2',
  lastMessagePreview: '새 메시지',
  lastMessageAt: T(20),
  sellerLastReadAt: null,
  unreadCount: 2,
  ...over,
});

const ids = (data: ConversationPages) => data.pages.map((p) => p.items.map((c) => c.id));

describe('compareMark', () => {
  it.each([
    ['마지막 메시지가 늦으면 크다', { lastMessageAt: T(2) }, { lastMessageAt: T(1) }, 1],
    ['마지막 메시지가 이르면 작다', { lastMessageAt: T(1) }, { lastMessageAt: T(2) }, -1],
    [
      '메시지 시각이 같으면 읽음 시각으로 가른다',
      { lastMessageAt: T(1), sellerLastReadAt: T(1) },
      { lastMessageAt: T(1), sellerLastReadAt: null },
      1,
    ],
    [
      '읽음 시각보다 메시지 시각이 먼저다(사전식)',
      { lastMessageAt: T(2), sellerLastReadAt: null },
      { lastMessageAt: T(1), sellerLastReadAt: T(1) },
      1,
    ],
    ['둘 다 같으면 0', { lastMessageAt: T(1) }, { lastMessageAt: T(1) }, 0],
    ['null은 어떤 시각보다 이르다', { lastMessageAt: null }, { lastMessageAt: T(0) }, -1],
  ])('%s', (_, a, b, expected) => {
    expect(compareMark(a, b)).toBe(expected);
  });
});

describe('mergeConversationUpdate', () => {
  it('새 메시지 이벤트를 반영하고 그 대화를 첫 페이지 맨 위로 올린다', () => {
    const data = pages([conv('1', { lastMessageAt: T(15) })], [conv('2'), conv('3')]);
    const { data: merged, applied, previous } = mergeConversationUpdate(data, event());
    expect(ids(merged)).toEqual([['2', '1'], ['3']]);
    expect(applied).toMatchObject({
      lastMessagePreview: '새 메시지',
      lastMessageAt: T(20),
      unreadCount: 2,
      updatedAt: T(20),
    });
    expect(previous?.unreadCount).toBe(1);
    expect(merged.pages[0]!.totalCount).toBe(3);
  });

  it.each([
    ['마지막 메시지가 더 오래된 이벤트', event({ lastMessageAt: T(5) })],
    ['같은 상태의 중복 이벤트', event({ lastMessageAt: T(10), sellerLastReadAt: T(10) })],
    ['메시지 시각은 같고 읽음 시각이 더 오래된 이벤트', event({ lastMessageAt: T(10) })],
  ])('반증: %s는 버린다', (_, e) => {
    const data = pages([conv('1'), conv('2', { sellerLastReadAt: T(10), unreadCount: 0 })]);
    const result = mergeConversationUpdate(data, e);
    expect(result.applied).toBeNull();
    expect(result.data).toBe(data);
  });

  it('반증: 로컬 읽음 시각이 이벤트의 마지막 메시지 이후면 미읽음을 0으로 본다', () => {
    // 목록의 마지막 메시지는 아직 옛것(T10)인데 방에서 T20까지 읽었다 — 읽기 전 스냅샷 이벤트가 늦게 왔다
    const data = pages([conv('2', { sellerLastReadAt: T(20), unreadCount: 0 })]);
    const { applied } = mergeConversationUpdate(data, event({ unreadCount: 3 }));
    expect(applied).toMatchObject({
      lastMessageAt: T(20),
      sellerLastReadAt: T(20),
      unreadCount: 0,
    });
  });

  it('로컬 읽음 이후에 온 메시지면 이벤트의 미읽음 수를 쓴다', () => {
    const data = pages([conv('2', { sellerLastReadAt: T(15), unreadCount: 0 })]);
    const { applied } = mergeConversationUpdate(data, event({ unreadCount: 1 }));
    expect(applied).toMatchObject({ sellerLastReadAt: T(15), unreadCount: 1 });
  });

  it('처음 보는 대화는 맨 위에 넣고 전체 건수를 늘린다', () => {
    const data = pages([conv('1')]);
    const {
      data: merged,
      applied,
      previous,
    } = mergeConversationUpdate(
      data,
      event({ conversationId: '9', accountId: 'a9', buyerNickname: null }),
    );
    expect(previous).toBeUndefined();
    expect(ids(merged)).toEqual([['9', '1']]);
    expect(applied).toMatchObject({ buyerNickname: null, accountId: 'a9' });
    expect(merged.pages[0]!.totalCount).toBe(4);
  });

  it('이벤트에 닉네임이 없으면 기존 닉네임을 지킨다', () => {
    const { applied } = mergeConversationUpdate(
      pages([conv('2')]),
      event({ buyerNickname: null, lastMessagePreview: null }),
    );
    expect(applied).toMatchObject({ buyerNickname: '닉2', lastMessagePreview: null });
  });
});

describe('applyReadState', () => {
  it('읽음 응답을 제자리에 반영하고 정렬 기준은 두다', () => {
    const data = pages([conv('1'), conv('2', { unreadCount: 2 })]);
    const read = conv('2', { sellerLastReadAt: T(10), unreadCount: 0, updatedAt: T(30) });
    const next = applyReadState(data, read);
    expect(ids(next)).toEqual([['1', '2']]);
    expect(findConversation(next, '2')).toMatchObject({
      sellerLastReadAt: T(10),
      unreadCount: 0,
      updatedAt: T(10),
    });
  });

  it('반증: 요청 사이에 더 새 메시지가 왔으면 미읽음은 두고 읽음 시각만 당긴다', () => {
    const data = pages([conv('2', { lastMessageAt: T(20), unreadCount: 2 })]);
    const read = conv('2', { lastMessageAt: T(10), sellerLastReadAt: T(10), unreadCount: 0 });
    expect(findConversation(applyReadState(data, read), '2')).toMatchObject({
      lastMessageAt: T(20),
      sellerLastReadAt: T(10),
      unreadCount: 2,
    });
  });

  it('목록에 없는 대화면 그대로 둔다', () => {
    const data = pages([conv('1')]);
    expect(applyReadState(data, conv('7'))).toBe(data);
    expect(findConversation(undefined, '1')).toBeUndefined();
  });
});

it.each([
  [0, false],
  [1, true],
])('답변 필요는 미읽음 %d건이면 %s', (unreadCount, expected) => {
  expect(needsReply({ unreadCount })).toBe(expected);
});
