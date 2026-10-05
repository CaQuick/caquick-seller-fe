import { focusManager, onlineManager, useQuery } from '@tanstack/react-query';
import { router, Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type Sink } from 'graphql-ws';
import { type ReactNode } from 'react';
import { HttpResponse, graphql } from 'msw';

import { homeKeys } from '@/features/home';
import { disposeWsClient } from '@/shared/api';
import { showToast } from '@/shared/ui';
import { gqlError, gqlOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers, createTestQueryClient } from '@/test/render';

import { type Message } from '../api/messages';
import { MARK_READ_DEBOUNCE_MS } from '../model/use-mark-read';
import { ChatRoomScreen } from './chat-room-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));

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

// 2026-10-06(화) KST 09:0x
const at = (min: number) => new Date(Date.UTC(2026, 9, 6, 0, min)).toISOString();

const msg = (id: string, over: Partial<Message> = {}): Message => ({
  id,
  conversationId: 'c1',
  senderType: 'USER',
  senderAccountId: 'u1',
  bodyFormat: 'TEXT',
  bodyText: `메시지${id}`,
  bodyHtml: null,
  createdAt: at(2),
  ...over,
});

const MESSAGES = [
  msg('4', {
    senderType: 'STORE',
    senderAccountId: 's1',
    bodyText: '네, 가능합니다.',
    createdAt: at(5),
  }),
  msg('3', {
    senderType: 'STORE',
    senderAccountId: null,
    bodyFormat: 'HTML',
    bodyText: null,
    bodyHtml: '<p onclick="x()">레터링은 <strong>12자</strong>까지</p><script>alert(1)</script>',
  }),
  msg('2', { bodyText: '레터링 문구를 바꿀 수 있을까요?' }),
  msg('s', {
    senderType: 'SYSTEM',
    senderAccountId: null,
    bodyText: '대화가 시작되었습니다',
    createdAt: at(1),
  }),
  msg('1', {
    bodyText: '어제 문의',
    createdAt: new Date(Date.UTC(2026, 9, 5, 0, 0)).toISOString(),
  }),
];

const conversation = {
  id: 'c1',
  accountId: 'a1',
  buyerNickname: '김다은',
  lastMessagePreview: '네, 가능합니다.',
  lastMessageAt: at(5),
  sellerLastReadAt: at(5),
  unreadCount: 0,
  updatedAt: at(5),
};

const messages = (items: Message[] = MESSAGES, hasMore = false) =>
  graphql.query('SellerChatsMessages', ({ variables }) => {
    const cursor = (variables.input as { cursor?: string | null }).cursor ?? null;
    return HttpResponse.json({
      data: {
        sellerConversationMessages: cursor
          ? {
              items: [msg('0', { bodyText: '더 오래된 메시지' })],
              totalCount: 5,
              hasMore: false,
              nextCursor: null,
            }
          : { items, totalCount: items.length, hasMore, nextCursor: hasMore ? 'older' : null },
      },
    });
  });

let readCalls = 0;
const markRead = graphql.mutation('SellerChatsMarkRead', () => {
  readCalls += 1;
  return HttpResponse.json({ data: { sellerMarkConversationRead: conversation } });
});
const buyerOrder = (items: { id: string; buyerName: string }[]) =>
  gqlOk('SellerChatsBuyerOrder', {
    sellerOrderList: {
      items: items.map((o) => ({
        ...o,
        pickupAt: '2026-10-08T06:30:00.000Z',
        firstItemName: '크리스마스 눈사람',
      })),
    },
  });

/** RNTL 14의 act는 비동기다 — 동기 작업도 Promise로 감싸 기다린다 */
const inAct = (fn: () => unknown) => act(() => Promise.resolve().then(fn));

const roomSink = () => {
  const i = mockWs.payloads.findIndex((p) => p.query.includes('conversationMessageAdded'));
  return mockWs.sinks[i]!;
};
const emitMessage = (m: Partial<Message> & { id: string }) =>
  inAct(() =>
    roomSink().next({
      data: { conversationMessageAdded: { ...msg(m.id), ...m, senderAccountId: undefined } },
    }),
  );

/** renderRouter는 가짜 타이머를 켠다 — 디바운스 창을 넘겨 흘린다 */
const pastDebounce = () => inAct(() => jest.advanceTimersByTime(MARK_READ_DEBOUNCE_MS * 2));

const open = () =>
  renderRouter(
    {
      chats: () => null,
      'chats/[conversationId]': ChatRoomScreen,
      'orders/[id]': () => null,
      'store/faq/index': () => null,
    },
    { initialUrl: '/chats/c1', ...withProviders() },
  );

/** 탭바 배지처럼 홈 대시보드 키를 지켜보며 조회 횟수를 센다 */
let dashboardFetches = 0;
function BadgeLayout() {
  useQuery({
    queryKey: homeKeys.dashboard(),
    queryFn: () => ({ unansweredConversationCount: ++dashboardFetches }),
  });
  return <Slot />;
}
const openWithBadge = () =>
  renderRouter(
    { _layout: BadgeLayout, 'chats/[conversationId]': ChatRoomScreen },
    { initialUrl: '/chats/c1', ...withProviders() },
  );

describe('ChatRoomScreen', () => {
  beforeEach(() => {
    readCalls = 0;
    mockWs.sinks = [];
    mockWs.payloads = [];
    server.use(messages(), markRead, buyerOrder([{ id: 'o9', buyerName: '김다은' }]));
  });
  afterEach(() => {
    disposeWsClient();
    onlineManager.setOnline(true);
  });

  it('구매자·판매자·자동응답 버블과 날짜 구분선·시각을 그리고, HTML은 허용 태그만 렌더한다', async () => {
    await open();
    expect(await screen.findByText('레터링 문구를 바꿀 수 있을까요?')).toBeTruthy();
    expect(screen.getByText('네, 가능합니다.')).toBeTruthy();
    expect(screen.getByText('자동응답')).toBeTruthy();
    expect(screen.getByText('12자')).toBeTruthy();
    expect(screen.queryByText(/alert/)).toBeNull();
    expect(screen.getByText('10월 6일 화요일')).toBeTruthy();
    expect(screen.getByText('10월 5일 월요일')).toBeTruthy();
    expect(screen.getByText('09:05')).toBeTruthy();
    expect(screen.getByText('대화가 시작되었습니다')).toBeTruthy();
    // 헤더 닉네임은 읽음 처리 응답에서 온다(목록 캐시가 없는 딥링크 진입)
    expect(await screen.findByRole('header', { name: '김다은' })).toBeTruthy();
  });

  it('진입 때 읽음 처리를 디바운스해 한 번 부르고, 구매자 메시지가 오면 다시 부른다', async () => {
    await open();
    await screen.findByText('네, 가능합니다.');
    await waitFor(() => expect(readCalls).toBe(1));

    // 반증: 판매자(자동응답) 메시지는 읽음 계기가 아니다
    server.use(
      messages([
        msg('5', { senderType: 'STORE', senderAccountId: null, bodyText: '자동 안내' }),
        ...MESSAGES,
      ]),
    );
    await emitMessage({ id: '5', senderType: 'STORE', bodyText: '자동 안내', createdAt: at(6) });
    expect(await screen.findByText('자동 안내')).toBeTruthy();
    await pastDebounce();
    expect(readCalls).toBe(1);

    await emitMessage({ id: '6', bodyText: '혹시 답변 가능할까요?', createdAt: at(7) });
    await emitMessage({ id: '7', bodyText: '연달아 보냄', createdAt: at(7) });
    expect(await screen.findByText('연달아 보냄')).toBeTruthy();
    await waitFor(() => expect(readCalls).toBe(2));
    await pastDebounce();
    expect(readCalls).toBe(2);
  });

  it('앱이 포그라운드로 돌아오면 다시 읽음 처리한다', async () => {
    await open();
    await screen.findByText('네, 가능합니다.');
    await waitFor(() => expect(readCalls).toBe(1));
    await inAct(() => focusManager.setFocused(false));
    await pastDebounce();
    expect(readCalls).toBe(1);
    await inAct(() => focusManager.setFocused(true));
    await waitFor(() => expect(readCalls).toBe(2));
    focusManager.setFocused(undefined);
  });

  it('읽음 처리가 끝나면 탭바 배지·홈 KPI가 읽는 대시보드를 다시 부른다', async () => {
    dashboardFetches = 0;
    await openWithBadge();
    await screen.findByText('네, 가능합니다.');
    await waitFor(() => expect(readCalls).toBe(1));
    await waitFor(() => expect(dashboardFetches).toBe(2));
  });

  it('답장을 보내면 대시보드를 다시 부르고, 실패한 전송은 부르지 않는다', async () => {
    let sends = 0;
    server.use(
      graphql.mutation('SellerChatsSendMessage', () =>
        ++sends === 1
          ? HttpResponse.error()
          : HttpResponse.json({
              data: {
                sellerSendConversationMessage: msg('9', {
                  senderType: 'STORE',
                  senderAccountId: 's1',
                  bodyText: '확인했습니다',
                }),
              },
            }),
      ),
    );
    const toast = jest.spyOn(showToast, 'error').mockImplementation(() => 'id');
    dashboardFetches = 0;
    await openWithBadge();
    await screen.findByText('네, 가능합니다.');
    await waitFor(() => expect(dashboardFetches).toBe(2));
    await fireEvent.changeText(screen.getByLabelText('메시지 입력'), '확인했습니다');
    await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
    const retry = await screen.findByRole('button', { name: '재시도: 확인했습니다' });
    expect(dashboardFetches).toBe(2);
    await fireEvent.press(retry);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^재시도/ })).toBeNull());
    await waitFor(() => expect(dashboardFetches).toBe(3));
    toast.mockRestore();
  });

  it('뒤로 가기는 이전 화면으로 돌아가고, 메뉴 닫기는 시트를 내린다', async () => {
    const r = renderRouter(
      { chats: () => null, 'chats/[conversationId]': ChatRoomScreen },
      { initialUrl: '/chats', ...withProviders() },
    );
    await r;
    await inAct(() =>
      router.push({ pathname: '/chats/[conversationId]', params: { conversationId: 'c1' } }),
    );
    await fireEvent.press(await screen.findByRole('button', { name: '닫기' }));
    await fireEvent.press(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(r.getPathname()).toBe('/chats');
  });

  it('같은 id의 메시지가 다시 와도 한 번만 그린다', async () => {
    await open();
    await screen.findByText('네, 가능합니다.');
    await emitMessage({ id: '2', bodyText: '레터링 문구를 바꿀 수 있을까요?' });
    await emitMessage({ id: '8', bodyText: '새 문의' });
    await emitMessage({ id: '8', bodyText: '새 문의' });
    expect(await screen.findAllByText('새 문의')).toHaveLength(1);
    expect(screen.getAllByText('레터링 문구를 바꿀 수 있을까요?')).toHaveLength(1);
  });

  it('TEXT로 보내고, 전송 중에는 입력과 보내기를 막는다', async () => {
    let release!: () => void;
    let sent: unknown = null;
    server.use(
      graphql.mutation('SellerChatsSendMessage', async ({ variables }) => {
        sent = variables.input;
        await new Promise<void>((r) => (release = r));
        return HttpResponse.json({
          data: {
            sellerSendConversationMessage: msg('9', {
              senderType: 'STORE',
              senderAccountId: 's1',
              bodyText: '픽업 때 보냉백을 챙겨 오세요',
              createdAt: at(9),
            }),
          },
        });
      }),
    );
    await open();
    await screen.findByText('네, 가능합니다.');
    const send = screen.getByRole('button', { name: '보내기' });
    expect(send).toBeDisabled();
    expect(screen.getByLabelText('메시지 입력').props.maxLength).toBe(2000);
    await fireEvent.changeText(
      screen.getByLabelText('메시지 입력'),
      '  픽업 때 보냉백을 챙겨 오세요 ',
    );
    await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
    expect(await screen.findByText('픽업 때 보냉백을 챙겨 오세요')).toBeTruthy();
    await waitFor(() =>
      expect(sent).toEqual({
        conversationId: 'c1',
        bodyFormat: 'TEXT',
        bodyText: '픽업 때 보냉백을 챙겨 오세요',
      }),
    );
    expect(screen.getByLabelText('메시지 입력').props.editable).toBe(false);
    await fireEvent.changeText(screen.getByLabelText('메시지 입력'), '두 번째');
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();

    await inAct(() => release());
    await waitFor(() => expect(screen.getByLabelText('메시지 입력').props.editable).toBe(true));
    expect(screen.getAllByText('픽업 때 보냉백을 챙겨 오세요')).toHaveLength(1);
    expect(screen.getByText('09:09')).toBeTruthy();
  });

  it('전송에 실패하면 재시도로 같은 내용을 다시 보낸다', async () => {
    const toast = jest.spyOn(showToast, 'error').mockImplementation(() => 'id');
    const bodies: unknown[] = [];
    server.use(
      graphql.mutation('SellerChatsSendMessage', ({ variables }) => {
        bodies.push((variables.input as { bodyText: string }).bodyText);
        return bodies.length === 1
          ? HttpResponse.error()
          : HttpResponse.json({
              data: {
                sellerSendConversationMessage: msg('9', {
                  senderType: 'STORE',
                  senderAccountId: 's1',
                  bodyText: '다시 보낼 글',
                }),
              },
            });
      }),
    );
    await open();
    await screen.findByText('네, 가능합니다.');
    await fireEvent.changeText(screen.getByLabelText('메시지 입력'), '다시 보낼 글');
    await fireEvent.press(screen.getByRole('button', { name: '보내기' }));
    const retry = await screen.findByRole('button', { name: '재시도: 다시 보낼 글' });
    expect(toast).toHaveBeenCalledWith('서버에 연결할 수 없습니다.');
    await fireEvent.press(retry);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^재시도/ })).toBeNull());
    expect(bodies).toEqual(['다시 보낼 글', '다시 보낼 글']);
    expect(screen.getAllByText('다시 보낼 글')).toHaveLength(1);
    toast.mockRestore();
  });

  it('네트워크가 끊긴 동안 연결 배너를 보여 준다', async () => {
    await open();
    await screen.findByText('네, 가능합니다.');
    expect(screen.queryByText('연결을 다시 시도하는 중…')).toBeNull();
    await inAct(() => onlineManager.setOnline(false));
    expect(screen.getByText('연결을 다시 시도하는 중…')).toBeTruthy();
    await inAct(() => onlineManager.setOnline(true));
    expect(screen.queryByText('연결을 다시 시도하는 중…')).toBeNull();
  });

  it('⋯ 메뉴의 자동응답 관리는 FAQ 화면으로, 주문 보기는 이 구매자의 최근 주문으로 간다', async () => {
    const r = open();
    await r;
    await fireEvent.press(await screen.findByRole('button', { name: '더보기' }));
    expect(await screen.findByText('크리스마스 눈사람 · 10월 8일 15:30 픽업')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^자동응답 관리/ }));
    expect(r.getPathname()).toBe('/store/faq');

    await inAct(() =>
      router.push({ pathname: '/chats/[conversationId]', params: { conversationId: 'c1' } }),
    );
    await fireEvent.press(await screen.findByRole('link', { name: '주문 보기' }));
    expect(r.getPathname()).toBe('/orders/o9');
  });

  it('반증: 이름이 부분일치만 하는 주문이면 주문 보기를 숨긴다', async () => {
    server.use(buyerOrder([{ id: 'o1', buyerName: '김다은님' }]));
    await open();
    expect(await screen.findByRole('header', { name: '김다은' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('link', { name: '주문 보기' })).toBeNull());
    expect(screen.queryByText(/픽업$/)).toBeNull();
  });

  it('위로 끝까지 올리면 이전 메시지를 커서로 더 불러온다', async () => {
    server.use(messages(MESSAGES, true));
    await open();
    await screen.findByText('네, 가능합니다.');
    // 더 불러올 것이 있으면 가장 오래된 메시지 위에 구분선을 확정하지 않는다
    expect(screen.queryByText('10월 5일 월요일')).toBeNull();
    await fireEvent(screen.getByTestId('chat-messages'), 'onEndReached');
    expect(await screen.findByText('더 오래된 메시지')).toBeTruthy();
  });

  it('메시지가 없으면 빈 상태를 보여 준다', async () => {
    server.use(messages([]));
    await open();
    expect(await screen.findByText('아직 주고받은 메시지가 없어요')).toBeTruthy();
  });

  it('없는 대화면 토스트를 띄우고 목록으로 돌아간다', async () => {
    const toast = jest.spyOn(showToast, 'error').mockImplementation(() => 'id');
    server.use(
      gqlError('SellerChatsMessages', {
        message: '대화를 찾을 수 없습니다.',
        code: 'CONVERSATION_NOT_FOUND',
        classification: 'NOT_FOUND',
        statusCode: 404,
      }),
    );
    const r = renderRouter(
      { chats: () => null, 'chats/[conversationId]': ChatRoomScreen },
      { initialUrl: '/chats', ...withProviders() },
    );
    await r;
    await inAct(() =>
      router.push({ pathname: '/chats/[conversationId]', params: { conversationId: 'c1' } }),
    );
    await waitFor(() => expect(r.getPathname()).toBe('/chats'));
    expect(toast).toHaveBeenCalledWith('대화를 찾을 수 없습니다.');
    toast.mockRestore();
  });

  it('불러오기 실패는 다시 시도를 보여 준다', async () => {
    server.use(
      gqlError('SellerChatsMessages', { message: 'x', classification: 'INTERNAL_SERVER_ERROR' }),
    );
    await open();
    expect(
      await screen.findByText('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'),
    ).toBeTruthy();
    server.use(messages());
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('네, 가능합니다.')).toBeTruthy();
  });
});
