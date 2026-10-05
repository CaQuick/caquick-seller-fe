import { graphql, HttpResponse } from 'msw';

import { type CursorInput } from '@/graphql/generated/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient } from '@/test/render';

import { orderConversationQueryOptions } from './orders';

/** n번째 페이지(0부터)에 대화 1건, pages까지 다음 페이지가 있다 */
function conversationPages(pages: number, match: { page: number; accountId: string } | null) {
  const cursors: (string | null | undefined)[] = [];
  server.use(
    graphql.query<object, { input: CursorInput }>('SellerOrderConversations', ({ variables }) => {
      cursors.push(variables.input.cursor);
      const n = variables.input.cursor ? Number(variables.input.cursor) : 0;
      const accountId = match?.page === n ? match.accountId : `other-${n}`;
      return HttpResponse.json({
        data: {
          sellerConversations: {
            items: [{ id: `c${n}`, accountId, unreadCount: n }],
            hasMore: n + 1 < pages,
            nextCursor: n + 1 < pages ? String(n + 1) : null,
          },
        },
      });
    }),
  );
  return cursors;
}

const fetchConversation = (accountId: string) =>
  createTestQueryClient().fetchQuery(orderConversationQueryOptions(accountId));

describe('orderConversationQueryOptions', () => {
  it('다음 페이지로 넘어가며 주문자 계정의 대화를 찾는다', async () => {
    const cursors = conversationPages(3, { page: 1, accountId: '9' });
    await expect(fetchConversation('9')).resolves.toEqual({
      id: 'c1',
      accountId: '9',
      unreadCount: 1,
    });
    expect(cursors).toEqual([null, '1']);
  });

  it('마지막 페이지까지 없으면 null', async () => {
    const cursors = conversationPages(2, null);
    await expect(fetchConversation('9')).resolves.toBeNull();
    expect(cursors).toEqual([null, '1']);
  });

  it('5페이지를 넘겨 보지 않는다', async () => {
    const cursors = conversationPages(10, { page: 7, accountId: '9' });
    await expect(fetchConversation('9')).resolves.toBeNull();
    expect(cursors).toHaveLength(5);
  });
});
