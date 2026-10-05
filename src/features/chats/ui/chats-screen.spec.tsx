import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { type Sink } from 'graphql-ws';
import { type ReactNode } from 'react';
import { HttpResponse, graphql } from 'msw';

import { disposeWsClient } from '@/shared/api';
import { showToast } from '@/shared/ui';
import { gqlError, gqlOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers, createTestQueryClient } from '@/test/render';

import { type Conversation } from '../api/conversations';
import { ChatsScreen } from './chats-screen';

/** graphql-ws를 가짜로 — 구독 sink를 붙잡아 이벤트를 직접 흘린다 */
const mockWs = { sinks: [] as Sink<{ data?: unknown }>[], payloads: [] as { query: string }[] };
jest.mock('graphql-ws', () => ({
  createClient: jest.fn(() => ({
    subscribe: jest.fn((payload: { query: string }, sink: Sink<{ data?: unknown }>) => {
      mockWs.payloads.push(payload);
      mockWs.sinks.push(sink);
      return () => undefined;
    }),
    dispose: jest.fn(),
    terminate: jest.fn(),
  })),
}));

/** 라우터 렌더에 앱과 같은 Provider를 씌운다. QueryClient는 렌더마다 새로 */
function withProviders() {
  const queryClient = createTestQueryClient();
  return {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Providers queryClient={queryClient}>{children}</Providers>
    ),
  };
}

const NOW = Date.now();
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();

const conv = (id: string, over: Partial<Conversation> = {}): Conversation => ({
  id,
  accountId: `a${id}`,
  buyerNickname: `구매자${id}`,
  lastMessagePreview: `미리보기${id}`,
  lastMessageAt: ago(30),
  sellerLastReadAt: null,
  unreadCount: 0,
  updatedAt: ago(30),
  ...over,
});

const list = (items: Conversation[]) =>
  gqlOk('SellerChatsConversations', {
    sellerConversations: { items, totalCount: items.length, hasMore: false, nextCursor: null },
  });

const emit = (event: Record<string, unknown>) =>
  act(() =>
    Promise.resolve().then(() =>
      mockWs.sinks.at(-1)!.next({ data: { sellerConversationUpdated: event } }),
    ),
  );

const rows = () => screen.getAllByRole('button', { name: /^구매자/ });

const open = () =>
  renderRouter(
    { chats: ChatsScreen, 'chats/[conversationId]': () => null },
    { initialUrl: '/chats', ...withProviders() },
  );

describe('ChatsScreen', () => {
  beforeEach(() => {
    mockWs.sinks = [];
    mockWs.payloads = [];
  });
  afterEach(() => disposeWsClient());

  it('대화 행에 닉네임(없으면 구매자)·미리보기·상대 시각·미읽음 배지를 보여 주고 누르면 방으로 간다', async () => {
    server.use(
      list([
        conv('1', { unreadCount: 2, lastMessageAt: ago(0) }),
        conv('2', { buyerNickname: null, lastMessageAt: ago(10) }),
      ]),
    );
    const router = open();
    await router;
    expect(await screen.findByText('구매자1')).toBeTruthy();
    expect(screen.getByText('미리보기1')).toBeTruthy();
    expect(screen.getByText('방금')).toBeTruthy();
    expect(screen.getByLabelText('2건')).toBeTruthy();
    expect(screen.getByText('구매자')).toBeTruthy();
    expect(screen.getByText('10분 전')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^구매자1,/ }));
    expect(router.getPathname()).toBe('/chats/1');
  });

  it('답변 필요 필터는 미읽음이 있는 대화만 남기고 칩에 수를 붙인다', async () => {
    server.use(list([conv('1', { unreadCount: 1 }), conv('2'), conv('3', { unreadCount: 4 })]));
    await open();
    await screen.findByText('구매자1');
    await fireEvent.press(screen.getByRole('button', { name: '답변 필요 2' }));
    expect(screen.queryByText('구매자2')).toBeNull();
    expect(screen.getByText('구매자1')).toBeTruthy();
    expect(screen.getByText('구매자3')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '전체' }));
    expect(screen.getByText('구매자2')).toBeTruthy();
  });

  it('대화가 없으면 빈 상태, 답변 필요가 없으면 그 빈 상태를 보여 준다', async () => {
    server.use(list([conv('1')]));
    await open();
    await screen.findByText('구매자1');
    await fireEvent.press(screen.getByRole('button', { name: '답변 필요' }));
    expect(screen.getByText('답변이 필요한 문의가 없어요')).toBeTruthy();
  });

  it('목록이 비면 아직 문의가 없다고 안내한다', async () => {
    server.use(list([]));
    await open();
    expect(await screen.findByText('아직 문의가 없어요')).toBeTruthy();
    expect(screen.getByText('구매자가 문의를 보내면 여기에 표시됩니다')).toBeTruthy();
  });

  it.each([
    ['매장 없음', 'STORE_NOT_FOUND', 'NOT_FOUND', 404, '매장 정보를 찾을 수 없습니다.'],
    [
      '정지 계정',
      'ACCOUNT_NOT_ACTIVE',
      'FORBIDDEN',
      403,
      '이용이 정지된 계정입니다. 관리자에게 문의해 주세요.',
    ],
  ])(
    '%s 오류는 코드 문구와 다시 시도를 보여 준다',
    async (_, code, classification, statusCode, text) => {
      server.use(
        gqlError('SellerChatsConversations', { message: 'x', code, classification, statusCode }),
      );
      await open();
      expect(await screen.findByText(text)).toBeTruthy();
      server.use(list([conv('1')]));
      await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
      expect(await screen.findByText('구매자1')).toBeTruthy();
    },
  );

  it('스크롤 끝에서 다음 페이지를 커서로 이어 붙인다', async () => {
    const cursors: unknown[] = [];
    server.use(
      graphql.query('SellerChatsConversations', ({ variables }) => {
        const cursor = (variables.input as { cursor?: string | null }).cursor ?? null;
        cursors.push(cursor);
        const page = cursor ? [conv('2')] : [conv('1')];
        return HttpResponse.json({
          data: {
            sellerConversations: {
              items: page,
              totalCount: 2,
              hasMore: !cursor,
              nextCursor: cursor ? null : 'n1',
            },
          },
        });
      }),
    );
    await open();
    await screen.findByText('구매자1');
    await fireEvent(screen.getByTestId('chats-list'), 'onEndReached');
    expect(await screen.findByText('구매자2')).toBeTruthy();
    expect(cursors).toEqual([null, 'n1']);
  });

  it('구독 이벤트를 머지해 대화를 맨 위로 올리고, 오래된 이벤트는 버리며, 새 문의를 토스트로 알린다', async () => {
    const toast = jest.spyOn(showToast, 'info').mockImplementation(() => 'id');
    server.use(list([conv('1'), conv('2', { lastMessageAt: ago(60) })]));
    await open();
    await screen.findByText('구매자1');
    expect(mockWs.payloads[0]!.query).toContain('sellerConversationUpdated');

    await emit({
      conversationId: '2',
      accountId: 'a2',
      buyerNickname: '구매자2',
      lastMessagePreview: '픽업 시간을 늦출 수 있을까요?',
      lastMessageAt: ago(0),
      sellerLastReadAt: null,
      unreadCount: 1,
    });
    await waitFor(() => expect(within(rows()[0]!).getByText('구매자2')).toBeTruthy());
    expect(screen.getByText('픽업 시간을 늦출 수 있을까요?')).toBeTruthy();
    expect(toast).toHaveBeenCalledWith('새 문의 · 구매자2: 픽업 시간을 늦출 수 있을까요?');

    // 반증: 늦게 도착한 옛 이벤트는 미리보기를 되돌리지 않는다
    await emit({
      conversationId: '2',
      accountId: 'a2',
      buyerNickname: '구매자2',
      lastMessagePreview: '옛 메시지',
      lastMessageAt: ago(5),
      sellerLastReadAt: null,
      unreadCount: 3,
    });
    expect(screen.queryByText('옛 메시지')).toBeNull();
    expect(toast).toHaveBeenCalledTimes(1);
    toast.mockRestore();
  });
});
