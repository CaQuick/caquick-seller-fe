import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { graphql, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { StoreAuditLogsScreen } from './audit-logs-screen';

const log = (
  id: string,
  patch: {
    targetType: string;
    action: string;
    targetId?: string;
    beforeJson?: string | null;
    afterJson?: string | null;
  },
) => ({
  id,
  targetId: '7',
  beforeJson: null,
  afterJson: null,
  createdAt: '2026-10-06T00:12:00.000Z',
  ...patch,
});

const PAGE_1 = [
  log('1', {
    targetType: 'PRODUCT',
    action: 'UPDATE',
    beforeJson: '{"name":"크리스마스 눈사람","salePrice":35000}',
    afterJson: '{"name":"크리스마스 눈사람","salePrice":33000}',
  }),
  log('2', {
    targetType: 'ORDER',
    action: 'STATUS_CHANGE',
    targetId: '45',
    beforeJson: '{"status":"SUBMITTED"}',
    afterJson: '{"status":"CONFIRMED","note":null}',
  }),
  log('3', {
    targetType: 'CHANGE_PASSWORD',
    action: 'UPDATE',
    afterJson: '{"changedAt":"2026-10-03T02:20:00.000Z"}',
  }),
];
const PAGE_2 = [
  log('4', { targetType: 'PRODUCT', action: 'DELETE', beforeJson: '{"name":"할로윈 호박"}' }),
];

function logs(pages: Record<string, ReturnType<typeof log>[]> = { first: PAGE_1, c1: PAGE_2 }) {
  const calls: Record<string, unknown>[] = [];
  server.use(
    graphql.query('SellerStoreAuditLogs', ({ variables }) => {
      const input = variables.input as { cursor: string | null };
      calls.push(input);
      const items = pages[input.cursor ?? 'first'] ?? [];
      const hasMore = input.cursor === null && Boolean(pages.c1);
      return HttpResponse.json({
        data: {
          sellerAuditLogs: {
            items,
            totalCount: items.length,
            hasMore,
            nextCursor: hasMore ? 'c1' : null,
          },
        },
      });
    }),
  );
  return calls;
}

const open = () =>
  renderRouter(
    { 'store/audit-logs': StoreAuditLogsScreen },
    {
      initialUrl: '/store/audit-logs',
      wrapper: Providers,
    },
  );

// 오늘은 2026-10-06 KST — Date만 고정
beforeAll(() =>
  jest.useFakeTimers({
    now: new Date('2026-10-06T03:00:00.000Z'),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  }),
);
afterAll(() => jest.useRealTimers());

describe('조작 이력', () => {
  it('행을 누르면 키별 변경을 펼치고, 비밀번호는 펼치지 않는다', async () => {
    const calls = logs();
    await open();
    const product = await screen.findByRole('button', {
      name: '크리스마스 눈사람 수정, 오늘 09:12',
    });
    expect(screen.queryByText('할인가: 35,000원 → 33,000원')).toBeNull();

    await fireEvent.press(product);
    expect(screen.getByText('할인가: 35,000원 → 33,000원')).toBeTruthy();
    expect(product).toBeExpanded();

    await fireEvent.press(screen.getByRole('button', { name: '주문 #45 상태 변경, 오늘 09:12' }));
    expect(screen.getByText('상태: 접수 → 확정')).toBeTruthy();

    expect(screen.getByLabelText('비밀번호 수정, 오늘 09:12')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^비밀번호 수정/ })).toBeNull();
    expect(calls[0]).toEqual({ limit: 20, cursor: null, targetType: null });
  });

  it('이전 이력 더보기는 커서로 이어 붙인다', async () => {
    const calls = logs();
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '이전 이력 더보기' }));
    expect(await screen.findByText('할로윈 호박')).toBeTruthy();
    expect(calls.at(-1)).toEqual({ limit: 20, cursor: 'c1', targetType: null });
    expect(screen.queryByRole('button', { name: '이전 이력 더보기' })).toBeNull();
  });

  it('대상 칩을 고르면 그 종류로 다시 부른다', async () => {
    const calls = logs();
    await open();
    await screen.findByText('크리스마스 눈사람');
    await fireEvent.press(screen.getByRole('button', { name: '주문' }));
    await waitFor(() =>
      expect(calls.at(-1)).toEqual({ limit: 20, cursor: null, targetType: 'ORDER' }),
    );
    expect(screen.getByRole('button', { name: '주문' })).toBeSelected();
  });

  it('이력이 없으면 빈 상태를 보여 준다', async () => {
    logs({ first: [] });
    await open();
    expect(await screen.findByText('이력이 없어요')).toBeTruthy();
  });

  it('불러오지 못하면 다시 시도를 보여 준다', async () => {
    server.use(graphql.query('SellerStoreAuditLogs', () => HttpResponse.json({}, { status: 500 })));
    await open();
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeTruthy();
  });
});
