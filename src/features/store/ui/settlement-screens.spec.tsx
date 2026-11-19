import { notifyManager, type QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { graphql, HttpResponse } from 'msw';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { toast } from 'sonner-native';

import {
  type SellerStoreSettlementAccountQuery,
  type SellerStoreSettlementQuery,
  type SellerStoreSettlementsQuery,
  type SellerUpsertSettlementAccountInput,
} from '@/graphql/generated/graphql';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { ACCOUNT_COPY } from '../model/settlement-account';
import { StoreSettlementAccountScreen } from './settlement-account-screen';
import { StoreSettlementDetailScreen } from './settlement-detail-screen';
import { StoreSettlementsScreen } from './settlements-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));
jest.mock('sonner-native', () => ({
  Toaster: () => null,
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));

type Account = NonNullable<SellerStoreSettlementAccountQuery['sellerSettlementAccount']>;
type Settlement = SellerStoreSettlementsQuery['sellerSettlements']['items'][number];
type Detail = SellerStoreSettlementQuery['sellerSettlement'];

const KB = { code: '004', name: 'KB국민은행' };
const SHINHAN = { code: '088', name: '신한은행' };
const ACCOUNT: Account = {
  bank: KB,
  accountHolder: '해즈 케이크',
  accountNumberMasked: '****1234',
  updatedByRole: 'SELLER',
  updatedAt: '2026-11-18T05:02:00.000Z',
};

const ok = (operation: string, data: object) =>
  graphql.operation(({ operationName }) =>
    operationName === operation ? HttpResponse.json({ data }) : undefined,
  );
const fail = (operation: string, code: string, classification = 'BAD_USER_INPUT') =>
  graphql.operation(({ operationName }) =>
    operationName === operation
      ? HttpResponse.json({
          data: null,
          errors: [graphqlError({ message: '서버 문구', code, classification, statusCode: 400 })],
        })
      : undefined,
  );

function account(saved: Account | null) {
  server.use(
    ok('SellerStoreSettlementAccount', { sellerSettlementAccount: saved }),
    ok('SellerStorePaymentBanks', { paymentBanks: [KB, SHINHAN] }),
  );
}

function upsert(respond?: () => Response) {
  const inputs: SellerUpsertSettlementAccountInput[] = [];
  server.use(
    graphql.mutation<object, { input: SellerUpsertSettlementAccountInput }>(
      'SellerStoreUpsertSettlementAccount',
      ({ variables }) => {
        inputs.push(variables.input);
        return (
          respond?.() ??
          HttpResponse.json({
            data: {
              sellerUpsertSettlementAccount: {
                bank: SHINHAN,
                accountHolder: variables.input.accountHolder,
                accountNumberMasked: `****${variables.input.accountNumber.slice(-4)}`,
                updatedByRole: 'SELLER',
                updatedAt: '2026-11-19T03:00:00.000Z',
              },
            },
          })
        );
      },
    ),
  );
  return inputs;
}

function open(initialUrl: string, queryClient: QueryClient = createTestQueryClient()) {
  return renderRouter(
    {
      'store/settlement-account': StoreSettlementAccountScreen,
      'store/settlements/index': StoreSettlementsScreen,
      'store/settlements/[id]': StoreSettlementDetailScreen,
      'orders/[id]': () => <Text>주문 상세</Text>,
    },
    {
      initialUrl,
      wrapper: ({ children }: { children: ReactNode }) => (
        <Providers queryClient={queryClient}>{children}</Providers>
      ),
    },
  );
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });

// 오늘은 2026-11-19(목) KST 12:00 — Date만 고정하고 타이머는 실제로 둔다
beforeAll(() => {
  notifyManager.setScheduler((cb) => cb());
  jest.useFakeTimers({
    now: new Date('2026-11-19T03:00:00.000Z'),
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
  });
});
afterAll(() => {
  jest.useRealTimers();
  notifyManager.setScheduler((cb) => setTimeout(cb, 0));
});
afterEach(() => jest.clearAllMocks());

describe('정산 계좌', () => {
  it('등록 전이면 안내하고, 은행·번호·예금주를 채워야 저장할 수 있다', async () => {
    account(null);
    const inputs = upsert();
    const queryClient = createTestQueryClient();
    await open('/store/settlement-account', queryClient);
    expect(await screen.findByText(ACCOUNT_COPY.missing)).toBeTruthy();
    expect(screen.getByText('계좌 등록')).toBeTruthy();
    expect(button('저장')).toBeDisabled();

    await fireEvent.press(button('은행'));
    await fireEvent.press(await screen.findByRole('radio', { name: '신한은행' }));
    await fireEvent.changeText(screen.getByLabelText('계좌번호'), '110-123 456789');
    expect(button('저장')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('예금주'), ' 해즈 케이크 ');
    await fireEvent.press(button('저장'));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(ACCOUNT_COPY.saved));
    expect(inputs).toEqual([
      { bankCode: '088', accountNumber: '110123456789', accountHolder: '해즈 케이크' },
    ]);
    // 저장 즉시 폼을 비우고 응답의 끝 4자리만 보인다
    expect(await screen.findByText('****6789')).toBeTruthy();
    expect(screen.getByText('계좌 바꾸기')).toBeTruthy();
    expect(screen.getByLabelText('계좌번호')).toHaveProp('value', '');
    expect(screen.getByLabelText('예금주')).toHaveProp('value', '');
    expect(button('은행')).toHaveAccessibilityValue({ text: '은행을 골라 주세요' });
    expect(screen.queryByText(/110123456789|110-123/)).toBeNull();
    // 계좌번호 원문은 쿼리 캐시에도, 끝난 저장 요청 기록에도 남지 않는다
    const cached = JSON.stringify(
      queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    );
    expect(cached).not.toContain('110123456789');
    await waitFor(() =>
      expect(
        JSON.stringify(
          queryClient
            .getMutationCache()
            .getAll()
            .map((m) => m.state.variables),
        ),
      ).not.toContain('110123456789'),
    );
  });

  it('숫자 아닌 글자를 넣으면 바로 알리고 저장을 막는다', async () => {
    account(null);
    await open('/store/settlement-account');
    await fireEvent.press(await screen.findByRole('button', { name: '은행' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'KB국민은행' }));
    await fireEvent.changeText(screen.getByLabelText('계좌번호'), '1234567o9');
    await fireEvent.changeText(screen.getByLabelText('예금주'), '해즈');
    expect(screen.getByText(ACCOUNT_COPY.numberError)).toBeTruthy();
    expect(button('저장')).toBeDisabled();
  });

  it('등록된 계좌는 끝 4자리·예금주·마지막 수정 주체를 보이고, 관리자가 바꿨으면 알린다', async () => {
    account({ ...ACCOUNT, updatedByRole: 'ADMIN' });
    await open('/store/settlement-account');
    expect(await screen.findByText('****1234')).toBeTruthy();
    // 은행 시트(목)도 같은 이름을 그린다
    expect(screen.getAllByText('KB국민은행').length).toBeGreaterThan(0);
    expect(screen.getByText('해즈 케이크')).toBeTruthy();
    expect(screen.getByText('케이퀵 관리자 · 어제 14:02')).toBeTruthy();
    expect(screen.getByText(ACCOUNT_COPY.byAdmin)).toBeTruthy();
    expect(screen.getByText('계좌 바꾸기')).toBeTruthy();
  });

  it('본인이 바꾼 계좌에는 관리자 안내가 없다', async () => {
    account(ACCOUNT);
    await open('/store/settlement-account');
    expect(await screen.findByText('매장 · 어제 14:02')).toBeTruthy();
    expect(screen.queryByText(ACCOUNT_COPY.byAdmin)).toBeNull();
  });

  it('형식 오류는 폼 위에 알리고 입력을 남기며, 그 밖의 오류는 토스트로 알린다', async () => {
    account(null);
    server.use(fail('SellerStoreUpsertSettlementAccount', 'INVALID_ACCOUNT_NUMBER'));
    await open('/store/settlement-account');
    await fireEvent.press(await screen.findByRole('button', { name: '은행' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'KB국민은행' }));
    await fireEvent.changeText(screen.getByLabelText('계좌번호'), '12345678');
    await fireEvent.changeText(screen.getByLabelText('예금주'), '해즈');
    await fireEvent.press(button('저장'));
    expect(await screen.findByText(ACCOUNT_COPY.numberError)).toBeTruthy();
    expect(screen.getByLabelText('계좌번호')).toHaveProp('value', '12345678');
    expect(toast.error).not.toHaveBeenCalled();

    server.use(fail('SellerStoreUpsertSettlementAccount', 'STORE_NOT_FOUND', 'NOT_FOUND'));
    await fireEvent.press(button('저장'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('매장 정보를 찾을 수 없습니다.'));
  });

  it('계좌·은행 목록 조회에 실패하면 다시 시도로 다시 받는다', async () => {
    server.use(
      fail('SellerStoreSettlementAccount', 'INTERNAL_ERROR', 'INTERNAL_SERVER_ERROR'),
      fail('SellerStorePaymentBanks', 'INTERNAL_ERROR', 'INTERNAL_SERVER_ERROR'),
    );
    await open('/store/settlement-account');
    const retry = await screen.findByRole('button', { name: '다시 시도' });
    server.use(ok('SellerStoreSettlementAccount', { sellerSettlementAccount: null }));
    await fireEvent.press(retry);
    expect(await screen.findByText(ACCOUNT_COPY.missing)).toBeTruthy();

    // 은행 시트(목은 닫혀 있어도 그린다)의 다시 시도
    account(null);
    await fireEvent.press(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('radio', { name: '신한은행' })).toBeTruthy();
  });
});

const settlement = (id: string, patch: Partial<Settlement> = {}): Settlement => ({
  id,
  periodStart: '2026-11-09',
  periodEnd: '2026-11-15',
  orderCount: 3,
  commissionAmount: 11400,
  payoutAmount: 102600,
  status: 'PENDING',
  paidAt: null,
  ...patch,
});

function settlements(pages: Record<string, Settlement[]>) {
  const cursors: (string | null)[] = [];
  server.use(
    graphql.query('SellerStoreSettlements', ({ variables }) => {
      const { cursor } = variables.input as { cursor: string | null };
      cursors.push(cursor);
      const items = pages[cursor ?? 'first'] ?? [];
      const hasMore = cursor === null && Boolean(pages.c1);
      return HttpResponse.json({
        data: {
          sellerSettlements: {
            items,
            totalCount: items.length,
            hasMore,
            nextCursor: hasMore ? 'c1' : null,
          },
        },
      });
    }),
  );
  return cursors;
}

describe('정산 내역', () => {
  it('주간 정산을 기간·건수·수수료·정산 금액·송금 여부로 보이고 다음 페이지를 이어 붙인다', async () => {
    const cursors = settlements({
      first: [
        settlement('s2'),
        settlement('s1', {
          periodStart: '2026-11-02',
          periodEnd: '2026-11-08',
          status: 'PAID',
          paidAt: '2026-11-10T01:00:00.000Z',
        }),
      ],
      c1: [settlement('s0', { periodStart: '2025-12-29', periodEnd: '2026-01-04' })],
    });
    const router = open('/store/settlements');
    await router;
    expect(
      await screen.findByRole('button', {
        name: '11월 9일 (월) ~ 11월 15일 (일), 송금 대기, 주문 3건 · 수수료 11,400원, 정산 금액 102,600원',
      }),
    ).toBeTruthy();
    expect(button(/^11월 2일 \(월\) ~ 11월 8일 \(일\), 송금 완료/)).toBeTruthy();

    await fireEvent.press(button('이전 정산 더보기'));
    expect(await screen.findByText('2025년 12월 29일 (월) ~ 2026년 1월 4일 (일)')).toBeTruthy();
    expect(cursors).toEqual([null, 'c1']);
    expect(screen.queryByRole('button', { name: '이전 정산 더보기' })).toBeNull();

    server.use(ok('SellerStoreSettlement', { sellerSettlement: { ...DETAIL, id: 's2' } }));
    await fireEvent.press(button(/^11월 9일/));
    await waitFor(() => expect(router.getPathname()).toBe('/store/settlements/s2'));
  });

  it('목록을 못 받으면 다시 시도로 다시 받는다', async () => {
    server.use(fail('SellerStoreSettlements', 'INTERNAL_ERROR', 'INTERNAL_SERVER_ERROR'));
    await open('/store/settlements');
    const retry = await screen.findByRole('button', { name: '다시 시도' });
    settlements({ first: [settlement('s1')] });
    await fireEvent.press(retry);
    expect(await screen.findByText('11월 9일 (월) ~ 11월 15일 (일)')).toBeTruthy();
  });

  it('정산이 없으면 언제 생기는지 알린다', async () => {
    settlements({ first: [] });
    await open('/store/settlements');
    expect(await screen.findByText('아직 정산 내역이 없어요')).toBeTruthy();
  });
});

const DETAIL: Detail = {
  id: 's1',
  periodStart: '2026-11-09',
  periodEnd: '2026-11-15',
  orderCount: 2,
  settlementBaseAmount: 68000,
  commissionAmount: 6800,
  payoutAmount: 61200,
  status: 'PAID',
  paidAt: '2026-11-17T06:30:00.000Z',
  paidAccount: {
    bank: { name: 'KB국민은행' },
    accountHolder: '해즈',
    accountNumberMasked: '****1234',
  },
  orders: [
    {
      orderId: 'o1',
      orderNumber: 'ORD-1',
      productName: '딸기 케이크',
      status: 'PICKED_UP',
      commissionRateBps: 1000,
      settlementBaseAmount: 38000,
      commissionAmount: 3800,
      payoutAmount: 34200,
      settlementFinalizedAt: '2026-11-10T09:00:00.000Z',
    },
    {
      orderId: 'o2',
      orderNumber: 'ORD-2',
      productName: null,
      status: 'CANCELED',
      commissionRateBps: 1050,
      settlementBaseAmount: 30000,
      commissionAmount: 3150,
      payoutAmount: 26850,
      settlementFinalizedAt: '2026-11-12T01:00:00.000Z',
    },
  ],
};

describe('정산 상세', () => {
  it('합계·송금 일시·송금 계좌(끝 4자리)와 포함 주문을 보이고, 주문을 누르면 주문 상세로 간다', async () => {
    server.use(ok('SellerStoreSettlement', { sellerSettlement: DETAIL }));
    const router = open('/store/settlements/s1');
    await router;
    expect(await screen.findByText('11월 9일 (월) ~ 11월 15일 (일)')).toBeTruthy();
    expect(screen.getByText('송금 완료')).toBeTruthy();
    expect(screen.getByText('68,000원')).toBeTruthy();
    expect(screen.getByText('-6,800원')).toBeTruthy();
    expect(screen.getByText('61,200원')).toBeTruthy();
    expect(screen.getByText('11월 17일 15:30')).toBeTruthy();
    expect(screen.getByText('KB국민은행 ****1234 · 해즈')).toBeTruthy();
    expect(
      button(
        '딸기 케이크, 픽업 완료, 38,000원 · 수수료 3,800원 (10%), 11월 10일 18:00 확정, 지급 34,200원',
      ),
    ).toBeTruthy();
    expect(button(/^ORD-2, 취소, 30,000원 · 수수료 3,150원 \(10\.5%\)/)).toBeTruthy();

    await fireEvent.press(button(/^딸기 케이크/));
    await waitFor(() => expect(router.getPathname()).toBe('/orders/o1'));
  });

  it('송금 전이면 송금 일시·계좌를 두지 않는다', async () => {
    server.use(
      ok('SellerStoreSettlement', {
        sellerSettlement: { ...DETAIL, status: 'PENDING', paidAt: null, paidAccount: null },
      }),
    );
    await open('/store/settlements/s1');
    expect(await screen.findByText('송금 대기')).toBeTruthy();
    expect(screen.queryByText('송금 일시')).toBeNull();
    expect(screen.queryByText('송금 계좌')).toBeNull();
  });

  it('그 밖의 실패는 다시 시도로 다시 받는다', async () => {
    server.use(fail('SellerStoreSettlement', 'INTERNAL_ERROR', 'INTERNAL_SERVER_ERROR'));
    await open('/store/settlements/s1');
    const retry = await screen.findByRole('button', { name: '다시 시도' });
    server.use(ok('SellerStoreSettlement', { sellerSettlement: DETAIL }));
    await fireEvent.press(retry);
    expect(await screen.findByText('송금 완료')).toBeTruthy();
  });

  it('없는 정산이면 목록으로 돌려보낸다', async () => {
    server.use(fail('SellerStoreSettlement', 'SETTLEMENT_NOT_FOUND', 'NOT_FOUND'));
    settlements({ first: [] });
    const router = open('/store/settlements/s9');
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '목록으로' }));
    await waitFor(() => expect(router.getPathname()).toBe('/store/settlements'));
  });
});
