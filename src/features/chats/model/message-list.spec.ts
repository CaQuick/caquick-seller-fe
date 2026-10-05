import { type Message, type MessagePages } from '../api/messages';
import { bubbleKind, hasMessage, messageBody, upsertMessage } from './message-list';

const msg = (id: string, over: Partial<Message> = {}): Message => ({
  id,
  conversationId: 'c1',
  senderType: 'USER',
  senderAccountId: 'u1',
  bodyFormat: 'TEXT',
  bodyText: `본문${id}`,
  bodyHtml: null,
  createdAt: '2026-10-06T00:00:00.000Z',
  ...over,
});

const data = (...pages: Message[][]): MessagePages => ({
  pages: pages.map((items) => ({ items, hasMore: false, nextCursor: null })),
  pageParams: pages.map(() => null),
});

describe('bubbleKind', () => {
  it.each<[string, Pick<Message, 'senderType' | 'senderAccountId'>, string]>([
    ['구매자', { senderType: 'USER', senderAccountId: 'u1' }, 'user'],
    ['판매자 답장', { senderType: 'STORE', senderAccountId: 's1' }, 'store'],
    ['인사말·자동응답(계정 null)', { senderType: 'STORE', senderAccountId: null }, 'auto'],
    ['구독으로 온 매장 메시지(계정 모름)', { senderType: 'STORE' }, 'auto'],
    ['시스템', { senderType: 'SYSTEM', senderAccountId: null }, 'system'],
  ])('%s → %s', (_, m, expected) => {
    expect(bubbleKind(m)).toBe(expected);
  });
});

describe('upsertMessage', () => {
  it('새 메시지는 첫 페이지 맨 앞(최신)에 넣는다', () => {
    const next = upsertMessage(data([msg('2'), msg('1')], [msg('0')]), msg('3'));
    expect(next.pages.map((p) => p.items.map((m) => m.id))).toEqual([['3', '2', '1'], ['0']]);
  });

  it('반증: 이미 있는 id는 늘리지 않고 그 자리를 새 값으로 바꾼다', () => {
    const before = data(
      [msg('2', { senderType: 'STORE', senderAccountId: undefined })],
      [msg('1')],
    );
    const next = upsertMessage(before, msg('2', { senderType: 'STORE', senderAccountId: 's1' }));
    expect(next.pages.map((p) => p.items.map((m) => m.id))).toEqual([['2'], ['1']]);
    expect(next.pages[0]!.items[0]!.senderAccountId).toBe('s1');
    expect(hasMessage(next, '1')).toBe(true);
    expect(hasMessage(next, '9')).toBe(false);
    expect(hasMessage(undefined, '1')).toBe(false);
  });
});

it.each<[string, Partial<Message>, string]>([
  ['TEXT는 bodyText', { bodyFormat: 'TEXT', bodyText: '평문', bodyHtml: '<p>x</p>' }, '평문'],
  ['HTML은 bodyHtml', { bodyFormat: 'HTML', bodyText: '평문', bodyHtml: '<p>x</p>' }, '<p>x</p>'],
  ['본문이 비면 빈 문자열', { bodyFormat: 'TEXT', bodyText: null }, ''],
])('messageBody: %s', (_, over, expected) => {
  expect(messageBody(msg('1', over))).toBe(expected);
});
