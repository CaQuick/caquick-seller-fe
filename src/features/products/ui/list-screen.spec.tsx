import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import { type ReactElement } from 'react';
import { toast } from 'sonner-native';

import {
  type SellerProductListInput,
  type SellerProductsListQuery,
} from '@/graphql/generated/graphql';
import { gqlOk, graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers, createTestQueryClient } from '@/test/render';

import { BROWSE_COPY } from '../model/browse';
import { ProductsScreen } from './list-screen';

jest.mock('sonner-native', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

type Item = SellerProductsListQuery['sellerProducts']['items'][number] & { tags: string[] };

const PRODUCTS: Item[] = [
  {
    id: '1',
    name: '그림일기 케이크',
    regularPrice: 35000,
    salePrice: 33000,
    isActive: true,
    images: [{ id: 'i1', imageUrl: 'https://img/1.jpg' }],
    categories: [{ id: 'c-xmas', name: '크리스마스' }],
    tags: ['그림일기'],
  },
  {
    id: '2',
    name: '레터링 생일 케이크',
    regularPrice: 28000,
    salePrice: null,
    isActive: true,
    images: [],
    categories: [{ id: 'c-bday', name: '생일' }],
    tags: ['레터링'],
  },
  {
    id: '3',
    name: '하트 연인 케이크',
    regularPrice: 39000,
    salePrice: 36000,
    isActive: false,
    images: [],
    categories: [{ id: 'c-love', name: '연인' }],
    tags: [],
  },
];

const CATEGORIES = [
  { id: 'c-flat', name: '입체', categoryType: 'STYLE', sortOrder: 1 },
  { id: 'c-bday', name: '생일', categoryType: 'EVENT', sortOrder: 1 },
  { id: 'c-xmas', name: '크리스마스', categoryType: 'EVENT', sortOrder: 2 },
  { id: 'c-etc', name: '기타', categoryType: 'OTHER', sortOrder: 1 },
];

/** BE 동작 그대로: isActive를 생략하면 활성 상품만 준다 */
function listHandler(products: Item[] = PRODUCTS, calls: SellerProductListInput[] = []) {
  return graphql.query<SellerProductsListQuery, { input: SellerProductListInput }>(
    'SellerProductsList',
    ({ variables: { input } }) => {
      calls.push(input);
      const isActive = input.isActive ?? true;
      const items = products
        .filter((p) => p.isActive === isActive)
        .filter((p) => !input.categoryId || p.categories.some((c) => c.id === input.categoryId))
        .filter(
          (p) =>
            !input.search ||
            p.name.includes(input.search) ||
            p.tags.some((t) => t.includes(input.search!)),
        )
        .map(({ tags: _, ...p }) => p);
      return HttpResponse.json({
        data: {
          sellerProducts: { items, totalCount: items.length, hasMore: false, nextCursor: null },
        },
      });
    },
  );
}

const categoriesOk = gqlOk('SellerProductsFilterCategories', { categories: CATEGORIES });

function open() {
  const queryClient = createTestQueryClient();
  return renderRouter(
    {
      products: ProductsScreen,
      'products/[id]/index': () => null,
      'products/new/basic': () => null,
    },
    {
      initialUrl: '/products',
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );
}

const row = (name: string) => screen.findByRole('button', { name: new RegExp(`^${name},`) });

describe('ProductsScreen', () => {
  beforeEach(() => {
    jest.mocked(toast.error).mockClear();
  });

  it('판매 중을 기본으로 보여 주고, 행에 가격·할인 전 가격·카테고리를 그린다', async () => {
    const calls: SellerProductListInput[] = [];
    server.use(listHandler(PRODUCTS, calls), categoriesOk);
    await open();
    const first = await row('그림일기 케이크');
    expect(within(first).getByText('33,000원')).toBeTruthy();
    expect(within(first).getByText('35,000원')).toBeTruthy();
    expect(within(first).getByLabelText('크리스마스')).toBeTruthy();
    expect(screen.queryByText('하트 연인 케이크')).toBeNull();
    expect(calls[0]).toMatchObject({ isActive: true, limit: 20 });
    // 칩은 전체 → 이벤트(sortOrder) → 스타일, OTHER 제외
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('button', { name: /^(전체|생일|크리스마스|입체|기타)$/ })
          .map((c) => c.props.accessibilityLabel as string),
      ).toEqual(['전체', '생일', '크리스마스', '입체']),
    );
  });

  it('반증: 숨김 탭은 isActive:false를 명시해 숨긴 상품을 받는다(생략하면 BE가 활성만 준다)', async () => {
    const calls: SellerProductListInput[] = [];
    server.use(listHandler(PRODUCTS, calls), categoriesOk);
    await open();
    await row('그림일기 케이크');
    await fireEvent.press(screen.getByRole('tab', { name: '숨김' }));
    expect(await row('하트 연인 케이크')).toBeTruthy();
    expect(screen.queryByText('그림일기 케이크')).toBeNull();
    expect(calls.at(-1)).toHaveProperty('isActive', false);
  });

  it('카테고리 칩으로 거르고 전체로 되돌린다', async () => {
    const calls: SellerProductListInput[] = [];
    server.use(listHandler(PRODUCTS, calls), categoriesOk);
    await open();
    await row('그림일기 케이크');
    await fireEvent.press(await screen.findByRole('button', { name: '생일' }));
    await waitFor(() => expect(screen.queryByText('그림일기 케이크')).toBeNull());
    expect(await row('레터링 생일 케이크')).toBeTruthy();
    expect(calls.at(-1)).toMatchObject({ isActive: true, categoryId: 'c-bday' });
    expect(screen.getByRole('button', { name: '생일' })).toBeSelected();

    await fireEvent.press(screen.getByRole('button', { name: '전체' }));
    expect(await row('그림일기 케이크')).toBeTruthy();
    expect(calls.at(-1)).not.toHaveProperty('categoryId');
  });

  it('검색은 입력이 멈춘 뒤 한 번만 조회하고 조건에 맞는 상품이 없으면 안내한다', async () => {
    const calls: SellerProductListInput[] = [];
    server.use(listHandler(PRODUCTS, calls), categoriesOk);
    await open();
    await row('그림일기 케이크');
    const input = screen.getByLabelText(BROWSE_COPY.searchPlaceholder);
    await fireEvent.changeText(input, '레');
    await fireEvent.changeText(input, '레터링 ');
    expect(await row('레터링 생일 케이크')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('그림일기 케이크')).toBeNull());
    expect(calls.map((c) => c.search)).toEqual([undefined, '레터링']);

    await fireEvent.changeText(input, '없는상품');
    expect(await screen.findByText(BROWSE_COPY.emptyFilteredTitle)).toBeTruthy();
  });

  it('스위치는 응답 전에 바로 바뀌고, 성공하면 그대로 둔다', async () => {
    let sent: unknown;
    let responded = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      listHandler(),
      categoriesOk,
      graphql.mutation('SellerProductSetActive', async ({ variables }) => {
        sent = variables;
        await gate;
        responded = true;
        return HttpResponse.json({
          data: { sellerSetProductActive: { id: '1', isActive: false } },
        });
      }),
    );
    await open();
    await row('그림일기 케이크');
    const toggle = () => screen.getByRole('switch', { name: '그림일기 케이크 노출' });
    await fireEvent.press(toggle());
    await waitFor(() => expect(sent).toEqual({ input: { productId: '1', isActive: false } }));
    await waitFor(() => expect(toggle()).not.toBeChecked());
    release();
    await waitFor(() => expect(responded).toBe(true));
    expect(toggle()).not.toBeChecked();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('반증: 스위치 요청이 실패하면 원래 값으로 되돌리고 토스트를 띄운다', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      listHandler(),
      categoriesOk,
      graphql.mutation('SellerProductSetActive', async () => {
        await gate;
        return HttpResponse.json({
          data: null,
          errors: [
            graphqlError({
              message: '상품을 찾을 수 없습니다.',
              code: 'PRODUCT_NOT_FOUND',
              classification: 'NOT_FOUND',
              statusCode: 404,
            }),
          ],
        });
      }),
    );
    await open();
    await row('그림일기 케이크');
    const toggle = () => screen.getByRole('switch', { name: '그림일기 케이크 노출' });
    await fireEvent.press(toggle());
    await waitFor(() => expect(toggle()).not.toBeChecked());
    release();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('상품을 찾을 수 없습니다.'));
    await waitFor(() => expect(toggle()).toBeChecked());
  });

  it('상품이 하나도 없으면 빈 상태의 등록 버튼으로 1/3에 간다', async () => {
    server.use(listHandler([]), categoriesOk);
    const router = open();
    await router;
    expect(await screen.findByText(BROWSE_COPY.emptyTitle)).toBeTruthy();
    const buttons = screen.getAllByRole('button', { name: BROWSE_COPY.create });
    expect(buttons).toHaveLength(2); // 빈 상태 버튼 + FAB
    await fireEvent.press(buttons[0]!);
    expect(router.getPathname()).toBe('/products/new/basic');
  });

  it('숨김 탭이 비면 등록 버튼 없이 안내한다', async () => {
    server.use(listHandler(PRODUCTS.filter((p) => p.isActive)), categoriesOk);
    await open();
    await row('그림일기 케이크');
    await fireEvent.press(screen.getByRole('tab', { name: '숨김' }));
    expect(await screen.findByText(BROWSE_COPY.emptyHiddenTitle)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: BROWSE_COPY.create })).toHaveLength(1);
  });

  it('행을 누르면 상세로 간다', async () => {
    server.use(listHandler(), categoriesOk);
    const router = open();
    await router;
    await fireEvent.press(await row('그림일기 케이크'));
    expect(router.getPathname()).toBe('/products/1');
  });

  it('FAB는 등록 1/3로 간다', async () => {
    server.use(listHandler(), categoriesOk);
    const router = open();
    await router;
    await row('그림일기 케이크');
    await fireEvent.press(screen.getByRole('button', { name: BROWSE_COPY.create }));
    expect(router.getPathname()).toBe('/products/new/basic');
  });

  it('불러오지 못하면 다시 시도로 복구한다', async () => {
    server.use(
      categoriesOk,
      graphql.query('SellerProductsList', () => HttpResponse.error()),
    );
    await open();
    expect(await screen.findByText('불러오지 못했어요')).toBeTruthy();
    server.use(listHandler());
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(await row('그림일기 케이크')).toBeTruthy();
  });

  it('상세에서 돌아오거나 당겨서 새로고침하면 다시 조회한다', async () => {
    const calls: SellerProductListInput[] = [];
    server.use(listHandler(PRODUCTS, calls), categoriesOk);
    await open();
    await fireEvent.press(await row('그림일기 케이크'));
    await act(() => Promise.resolve(router.back()));
    await waitFor(() => expect(calls).toHaveLength(2));

    const { refreshControl } = screen.getByTestId('products-list').props as {
      refreshControl: ReactElement<{ onRefresh: () => void }>;
    };
    await act(() => Promise.resolve(refreshControl.props.onRefresh()));
    await waitFor(() => expect(calls).toHaveLength(3));
  });

  it('다음 페이지는 커서로 이어 붙인다', async () => {
    const cursors: (string | null | undefined)[] = [];
    const { tags: _, ...base } = PRODUCTS[0]!;
    const page = (id: string, nextCursor: string | null) => ({
      items: [{ ...base, id, name: `상품 ${id}` }],
      totalCount: 2,
      hasMore: nextCursor !== null,
      nextCursor,
    });
    server.use(
      categoriesOk,
      graphql.query<SellerProductsListQuery, { input: SellerProductListInput }>(
        'SellerProductsList',
        ({ variables: { input } }) => {
          cursors.push(input.cursor);
          return HttpResponse.json({
            data: { sellerProducts: input.cursor ? page('b', null) : page('a', 'cur-1') },
          });
        },
      ),
    );
    await open();
    await row('상품 a');
    await fireEvent(screen.getByTestId('products-list'), 'endReached');
    expect(await row('상품 b')).toBeTruthy();
    await fireEvent(screen.getByTestId('products-list'), 'endReached');
    expect(cursors).toEqual([null, 'cur-1']);
  });
});
