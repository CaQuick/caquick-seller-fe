import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { graphql, HttpResponse } from 'msw';

import { type SellerStoreMyStoreQuery } from '@/graphql/generated/graphql';
import { gqlError, gqlOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { StorePreviewScreen } from './preview-screen';

type Store = SellerStoreMyStoreQuery['sellerMyStore'];
const STORE: Store = {
  id: '3',
  storeName: '해즈 케이크',
  storePhone: '032-123-4567',
  addressFull: '청라커낼로 252 1층',
  addressCity: '인천',
  addressDistrict: '서구',
  addressNeighborhood: '청라동',
  mapProvider: 'NAVER',
  websiteUrl: null,
  businessHoursText: null,
  greetingMessage: null,
  profileImageUrl: 'https://cdn.caquick.site/logo.jpg',
  pickupSlotIntervalMinutes: 30,
  minLeadTimeMinutes: 1440,
  maxDaysAhead: 14,
  isActive: true,
};

const DETAIL = {
  storeDetail: {
    id: '3',
    storeName: '해즈 케이크',
    regionLabel: '인천 서구 청라동',
    ratingAverage: 4.8,
    reviewCount: 128,
    images: ['https://cdn.caquick.site/hero.jpg'],
  },
  storeProductCategories: [
    { id: '2', name: '크리스마스', sortOrder: 2, productCount: 1 },
    { id: '1', name: '생일', sortOrder: 1, productCount: 2 },
    { id: '9', name: '할로윈', sortOrder: 0, productCount: 0 },
  ],
};

const card = (id: string, name: string, regularPrice: number, salePrice: number | null = null) => ({
  product: {
    id,
    name,
    thumbnailUrl: null,
    regularPrice,
    salePrice,
    discountRate: salePrice ? Math.round((1 - salePrice / regularPrice) * 100) : 0,
  },
});

function products(byCategory: (categoryId: unknown) => ReturnType<typeof card>[]) {
  const calls: Record<string, unknown>[] = [];
  server.use(
    graphql.query('SellerStorePreviewProducts', ({ variables }) => {
      const input = variables.input as Record<string, unknown>;
      calls.push(input);
      const items = byCategory(input.categoryId);
      return HttpResponse.json({
        data: {
          storeProducts: { items, totalCount: items.length, hasMore: false, nextCursor: null },
        },
      });
    }),
  );
  return calls;
}

const open = () =>
  renderRouter(
    { 'store/preview': StorePreviewScreen },
    {
      initialUrl: '/store/preview',
      wrapper: Providers,
    },
  );

describe('구매자 화면 미리보기', () => {
  it('배너·매장 머리·상품 있는 카테고리 탭·상품 카드를 그린다', async () => {
    server.use(
      gqlOk('SellerStoreMyStore', { sellerMyStore: STORE }),
      gqlOk('SellerStorePreviewDetail', DETAIL),
    );
    const calls = products((categoryId) =>
      categoryId === '1'
        ? [card('11', '레터링 생일 케이크', 28000)]
        : [card('10', '그림일기 케이크', 35000, 33000), card('11', '레터링 생일 케이크', 28000)],
    );
    await open();
    expect(await screen.findByText('구매자에게 보이는 화면입니다')).toBeTruthy();
    expect(screen.getByText('해즈 케이크')).toBeTruthy();
    expect(screen.getByText('4.8 (128)')).toBeTruthy();
    expect(screen.getByText('인천 서구 청라동')).toBeTruthy();
    expect(screen.getByLabelText('매장 로고')).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel as string)).toEqual([
      '전체',
      '생일',
      '크리스마스',
    ]);
    expect(await screen.findByText('그림일기 케이크')).toBeTruthy();
    expect(screen.getByText('33,000원')).toBeTruthy();
    expect(screen.getByText('28,000원')).toBeTruthy();
    expect(calls).toEqual([{ storeId: '3', categoryId: null, cursor: null, limit: 20 }]);

    await fireEvent.press(screen.getByRole('tab', { name: '생일' }));
    await waitFor(() => expect(calls.at(-1)).toMatchObject({ categoryId: '1' }));
    await waitFor(() => expect(screen.queryByText('그림일기 케이크')).toBeNull());
  });

  it('끝까지 내리면 다음 상품을 이어 받는다', async () => {
    server.use(
      gqlOk('SellerStoreMyStore', { sellerMyStore: STORE }),
      gqlOk('SellerStorePreviewDetail', DETAIL),
    );
    const cursors: unknown[] = [];
    server.use(
      graphql.query('SellerStorePreviewProducts', ({ variables }) => {
        const { cursor } = variables.input as { cursor: string | null };
        cursors.push(cursor);
        return HttpResponse.json({
          data: {
            storeProducts: {
              items: [
                cursor ? card('12', '딸기 생크림', 30000) : card('10', '그림일기 케이크', 33000),
              ],
              totalCount: 2,
              hasMore: !cursor,
              nextCursor: cursor ? null : '10',
            },
          },
        });
      }),
    );
    await open();
    await screen.findByText('그림일기 케이크');
    await fireEvent(screen.getByTestId('preview-products'), 'onEndReached');
    expect(await screen.findByText('딸기 생크림')).toBeTruthy();
    expect(cursors).toEqual([null, '10']);
  });

  it('상품 카드를 누르면 구매자용 상세를 읽기 전용으로 연다', async () => {
    server.use(
      gqlOk('SellerStoreMyStore', { sellerMyStore: STORE }),
      gqlOk('SellerStorePreviewDetail', DETAIL),
      gqlOk('SellerStorePreviewProduct', {
        productDetail: {
          id: '10',
          name: '그림일기 케이크',
          description: '그림을 그려 드려요',
          purchaseNotice: null,
          images: [],
          regularPrice: 35000,
          salePrice: 33000,
          discountRate: 6,
        },
      }),
    );
    products(() => [card('10', '그림일기 케이크', 35000, 33000)]);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '그림일기 케이크 미리보기' }));
    expect(await screen.findByText('그림을 그려 드려요')).toBeTruthy();
    expect(screen.getByText('35,000원')).toBeTruthy();
    expect(screen.getByText('6%')).toBeTruthy();
    expect(screen.queryByText('구매 전 필독사항')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByTestId('product-preview')).toBeNull());
  });

  it('구매자에게 숨겨진 상품은 안내만 보여 준다', async () => {
    server.use(
      gqlOk('SellerStoreMyStore', { sellerMyStore: STORE }),
      gqlOk('SellerStorePreviewDetail', DETAIL),
      gqlError('SellerStorePreviewProduct', {
        message: '상품을 찾을 수 없습니다.',
        code: 'PRODUCT_NOT_FOUND',
        classification: 'NOT_FOUND',
        statusCode: 404,
      }),
    );
    products(() => [card('10', '그림일기 케이크', 35000)]);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '그림일기 케이크 미리보기' }));
    expect(await screen.findByText('구매자에게 보이지 않는 상품이에요')).toBeTruthy();
  });

  it('반증: 비공개 매장은 구매자용 조회를 부르지 않고 안내한다', async () => {
    server.use(gqlOk('SellerStoreMyStore', { sellerMyStore: { ...STORE, isActive: false } }));
    let detailCalls = 0;
    server.use(
      graphql.query('SellerStorePreviewDetail', () => {
        detailCalls += 1;
        return HttpResponse.json({ data: DETAIL });
      }),
    );
    await open();
    expect(await screen.findByText('매장이 비공개 상태예요')).toBeTruthy();
    expect(detailCalls).toBe(0);
  });

  it('구매자용 매장이 NOT_FOUND면 비공개 안내를 보여 준다', async () => {
    server.use(
      gqlOk('SellerStoreMyStore', { sellerMyStore: STORE }),
      gqlError('SellerStorePreviewDetail', {
        message: '매장을 찾을 수 없습니다.',
        code: 'STORE_NOT_FOUND',
        classification: 'NOT_FOUND',
        statusCode: 404,
      }),
    );
    await open();
    expect(await screen.findByText('구매자에게 매장이 보이지 않아 미리볼 수 없어요')).toBeTruthy();
  });

  it('보이는 상품이 없으면 빈 상태를 보여 준다', async () => {
    server.use(
      gqlOk('SellerStoreMyStore', { sellerMyStore: STORE }),
      gqlOk('SellerStorePreviewDetail', {
        ...DETAIL,
        storeDetail: { ...DETAIL.storeDetail, images: [], regionLabel: null },
      }),
    );
    products(() => []);
    await open();
    expect(await screen.findByText('구매자에게 보이는 상품이 없어요')).toBeTruthy();
    expect(screen.queryByLabelText('매장 대표 이미지')).toBeNull();
  });
});
