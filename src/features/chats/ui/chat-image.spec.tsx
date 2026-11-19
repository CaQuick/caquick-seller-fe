import { launchImageLibraryAsync } from 'expo-image-picker';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import { type ReactNode } from 'react';

import { disposeWsClient } from '@/shared/api';
import { showToast } from '@/shared/ui';
import { mockFileSizes, mockUploads } from '@/test/mocks';
import { server } from '@/test/msw/server';
import { Providers, createTestQueryClient } from '@/test/render';

import { type Message } from '../api/messages';
import { ChatRoomScreen } from './chat-room-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));
jest.mock('graphql-ws', () => ({
  createClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => undefined),
    dispose: jest.fn(),
    terminate: jest.fn(),
  })),
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: jest.fn(),
      renderAsync: () =>
        Promise.resolve({ saveAsync: () => Promise.resolve({ uri: 'file:///cache/chat.jpg' }) }),
    }),
  },
}));

const MB = 1024 * 1024;
const at = (min: number) => new Date(Date.UTC(2026, 9, 6, 0, min)).toISOString();
const msg = (id: string, over: Partial<Message> = {}): Message => ({
  id,
  conversationId: 'c1',
  senderType: 'USER',
  senderAccountId: 'u1',
  bodyFormat: 'TEXT',
  bodyText: `메시지${id}`,
  bodyHtml: null,
  imageUrl: null,
  orderCard: null,
  createdAt: at(2),
  ...over,
});
const conversation = {
  id: 'c1',
  accountId: 'a1',
  buyerNickname: '김다은',
  lastMessagePreview: '사진을 보냈습니다.',
  lastMessageAt: at(5),
  sellerLastReadAt: at(5),
  unreadCount: 0,
  updatedAt: at(5),
};

interface Calls {
  presign: unknown[];
  send: unknown[];
}

/** 대화방이 부르는 요청. 주문 보기 조회는 이름과 관계없이 빈 목록 */
function serve(
  items: Message[],
  respond: Partial<Record<keyof Calls, (n: number) => Response | undefined>> = {},
) {
  const calls: Calls = { presign: [], send: [] };
  server.use(
    graphql.query('SellerChatsMessages', () =>
      HttpResponse.json({
        data: {
          sellerConversationMessages: {
            items,
            totalCount: items.length,
            hasMore: false,
            nextCursor: null,
          },
        },
      }),
    ),
    graphql.mutation('SellerChatsMarkRead', () =>
      HttpResponse.json({ data: { sellerMarkConversationRead: conversation } }),
    ),
    graphql.operation(({ operationName }) =>
      operationName.startsWith('SellerChatsBuyer')
        ? HttpResponse.json({ data: { sellerOrderList: { items: [] } } })
        : undefined,
    ),
    graphql.mutation('SellerUploadsCreateUploadUrl', ({ variables }) => {
      calls.presign.push(variables.input);
      return (
        respond.presign?.(calls.presign.length) ??
        HttpResponse.json({
          data: {
            sellerCreateUploadUrl: {
              uploadUrl: 'https://s3/put',
              publicUrl: `https://cdn/chat-${calls.presign.length}.jpg`,
            },
          },
        })
      );
    }),
    graphql.mutation('SellerChatsSendMessage', ({ variables }) => {
      calls.send.push(variables.input);
      const input = variables.input as { imageUrl: string };
      return (
        respond.send?.(calls.send.length) ??
        HttpResponse.json({
          data: {
            sellerSendConversationMessage: msg('9', {
              senderType: 'STORE',
              senderAccountId: 's1',
              bodyFormat: 'IMAGE',
              bodyText: '사진을 보냈습니다.',
              imageUrl: input.imageUrl,
              createdAt: at(9),
            }),
          },
        })
      );
    }),
  );
  return calls;
}

const open = () => {
  const queryClient = createTestQueryClient();
  return renderRouter(
    { chats: () => null, 'chats/[conversationId]': ChatRoomScreen },
    {
      initialUrl: '/chats/c1',
      wrapper: ({ children }: { children: ReactNode }) => (
        <Providers queryClient={queryClient}>{children}</Providers>
      ),
    },
  );
};

const pick = (result: { canceled: boolean; assets?: unknown[] }) =>
  jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce(result as never);
const asset = { uri: 'file:///picked.jpg', width: 3000, height: 2000 };
const attach = async () => {
  await fireEvent.press(await screen.findByRole('button', { name: '사진 보내기' }));
  await act(() => Promise.resolve());
};

describe('채팅 사진', () => {
  let toast: jest.SpyInstance;
  beforeEach(() => {
    toast = jest.spyOn(showToast, 'error').mockImplementation(() => 'id');
    mockFileSizes.set('file:///cache/chat.jpg', 2 * MB);
  });
  afterEach(() => {
    toast.mockRestore();
    disposeWsClient();
  });

  it('받은 사진은 200×200으로 그리고 누르면 전체 화면으로 연다', async () => {
    serve([
      msg('1', {
        bodyFormat: 'IMAGE',
        bodyText: '사진을 보냈습니다.',
        imageUrl: 'https://cdn/buyer.jpg',
      }),
    ]);
    await open();
    const photo = await screen.findByRole('imagebutton', { name: '사진 크게 보기' });
    expect(screen.queryByText('사진을 보냈습니다.')).toBeNull();
    await fireEvent.press(photo);
    expect(await screen.findByText('사진 · 1/1')).toBeTruthy();
  });

  it('한 장을 골라 축소 → CONVERSATION_IMAGE로 올리고 IMAGE 메시지로 보낸다', async () => {
    const calls = serve([]);
    pick({ canceled: false, assets: [asset] });
    await open();
    await attach();
    await waitFor(() => expect(calls.send).toHaveLength(1));
    expect(launchImageLibraryAsync).toHaveBeenLastCalledWith({
      mediaTypes: ['images'],
      quality: 1,
    });
    expect(calls.presign).toEqual([
      { purpose: 'CONVERSATION_IMAGE', contentType: 'image/jpeg', contentLength: 2 * MB },
    ]);
    expect(mockUploads.map((u) => u.uri)).toEqual(['file:///cache/chat.jpg']);
    expect(calls.send).toEqual([
      { conversationId: 'c1', bodyFormat: 'IMAGE', imageUrl: 'https://cdn/chat-1.jpg' },
    ]);
    await waitFor(() =>
      expect(screen.getAllByRole('imagebutton', { name: '사진 크게 보기' })).toHaveLength(1),
    );
    expect(screen.queryByRole('button', { name: /^재시도/ })).toBeNull();
  });

  it('고르기를 취소하면 아무것도 보내지 않는다', async () => {
    const calls = serve([]);
    pick({ canceled: true });
    await open();
    await attach();
    expect(calls.presign).toEqual([]);
    expect(screen.queryByRole('imagebutton')).toBeNull();
  });

  it('보내기에 실패하면 재시도는 다시 올리지 않고 받은 주소로 보낸다', async () => {
    const calls = serve([], { send: (n) => (n === 1 ? HttpResponse.error() : undefined) });
    pick({ canceled: false, assets: [asset] });
    await open();
    await attach();
    await fireEvent.press(await screen.findByRole('button', { name: '재시도: 사진' }));
    await waitFor(() => expect(calls.send).toHaveLength(2));
    expect(calls.presign).toHaveLength(1);
    expect(calls.send[1]).toEqual(calls.send[0]);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^재시도/ })).toBeNull());
  });

  it('올리기에 실패하면 알리고, 재시도는 다시 올린다', async () => {
    const calls = serve([], {
      presign: (n) =>
        n === 1
          ? HttpResponse.json({
              data: null,
              errors: [
                { message: 'presign', extensions: { classification: 'INTERNAL_SERVER_ERROR' } },
              ],
            })
          : undefined,
    });
    pick({ canceled: false, assets: [asset] });
    await open();
    await attach();
    await fireEvent.press(await screen.findByRole('button', { name: '재시도: 사진' }));
    await waitFor(() => expect(calls.send).toHaveLength(1));
    expect(calls.presign).toHaveLength(2);
    expect(calls.send[0]).toMatchObject({ imageUrl: 'https://cdn/chat-2.jpg' });
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('10MB가 넘으면 올리지 않고 크기를 알린다', async () => {
    const calls = serve([]);
    mockFileSizes.set('file:///cache/chat.jpg', 10 * MB + 1);
    pick({ canceled: false, assets: [asset] });
    await open();
    await attach();
    await waitFor(() => expect(toast).toHaveBeenCalledWith('10MB 이하만 올릴 수 있습니다.'));
    expect(calls.presign).toEqual([]);
    expect(await screen.findByRole('button', { name: '재시도: 사진' })).toBeTruthy();
  });
});
