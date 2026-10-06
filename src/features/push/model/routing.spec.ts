import {
  hrefFor,
  parsePushData,
  type PushTarget,
  shouldToastMessage,
  staleKeysFor,
} from './routing';

const order: PushTarget = { kind: 'ORDER_SUBMITTED', orderId: '0' };
const message: PushTarget = { kind: 'BUYER_MESSAGE', conversationId: 'c9' };

describe('parsePushData', () => {
  it.each<[string, unknown, PushTarget | null]>([
    [
      '새 주문',
      { kind: 'ORDER_SUBMITTED', orderId: '12' },
      { kind: 'ORDER_SUBMITTED', orderId: '12' },
    ],
    ["주문 id '0'도 버리지 않는다", { kind: 'ORDER_SUBMITTED', orderId: '0' }, order],
    ['새 문의', { kind: 'BUYER_MESSAGE', conversationId: 'c9' }, message],
    ['주문 id 없음', { kind: 'ORDER_SUBMITTED' }, null],
    ['주문 id 빈 문자열', { kind: 'ORDER_SUBMITTED', orderId: '' }, null],
    ['주문 id가 숫자', { kind: 'ORDER_SUBMITTED', orderId: 12 }, null],
    ['문의에 주문 id만', { kind: 'BUYER_MESSAGE', orderId: '12' }, null],
    ['모르는 kind', { kind: 'REVIEW', orderId: '12' }, null],
    ['data 없음', undefined, null],
    ['null', null, null],
    ['문자열', 'ORDER_SUBMITTED', null],
  ])('%s', (_, data, expected) => {
    expect(parsePushData(data)).toEqual(expected);
  });
});

describe('hrefFor', () => {
  it('새 주문은 주문 상세, 새 문의는 대화방으로 보낸다', () => {
    expect(hrefFor(order)).toEqual({ pathname: '/orders/[id]', params: { id: '0' } });
    expect(hrefFor(message)).toEqual({
      pathname: '/chats/[conversationId]',
      params: { conversationId: 'c9' },
    });
  });
});

describe('staleKeysFor', () => {
  it('새 주문은 주문 목록과 홈을, 새 문의는 대화 목록·그 대화·홈을 다시 받게 한다', () => {
    expect(staleKeysFor(order)).toEqual([['orders', 'list'], ['home']]);
    expect(staleKeysFor(message)).toEqual([
      ['chats', 'conversations'],
      ['chats', 'messages', 'c9'],
      ['home'],
    ]);
  });
});

describe('shouldToastMessage', () => {
  it.each<[string, boolean]>([
    ['/', true],
    ['/orders/3', true],
    ['/chats/c1', true],
    ['/chats', false],
    ['/chats/c9', false],
  ])('%s → %s', (pathname, expected) => {
    expect(shouldToastMessage('c9', pathname)).toBe(expected);
  });
});
