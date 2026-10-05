import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import { toast } from 'sonner-native';

import {
  type SellerProductBuyerPreviewQuery,
  type SellerProductDetailQuery,
} from '@/graphql/generated/graphql';
import { gqlError, gqlOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers, createTestQueryClient } from '@/test/render';

import { BROWSE_COPY } from '../model/browse';
import { ProductDetailScreen } from './detail-screen';

jest.mock('sonner-native', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));

type Product = SellerProductDetailQuery['sellerProduct'];

const PRODUCT: Product = {
  id: '7',
  name: '그림일기 케이크',
  description: '원하는 그림과 문구를 올려 드리는 주문 제작 케이크예요.',
  purchaseNotice: '픽업 후 이동 중 케이크가 흔들릴 수 있습니다.',
  regularPrice: 35000,
  salePrice: 33000,
  preparationTimeMinutes: 120,
  isActive: true,
  images: [1, 2, 3, 4, 5].map((n) => ({
    id: `i${n}`,
    imageUrl: `https://img/${n}.jpg`,
    sortOrder: n,
  })),
  categories: [
    { id: 'c1', name: '크리스마스' },
    { id: 'c2', name: '입체' },
  ],
  tags: [
    { id: 't1', name: '눈' },
    { id: 't2', name: '트리' },
  ],
  optionGroups: [
    {
      id: 'g1',
      name: '케이크 사이즈',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      isActive: true,
      optionItems: [{ id: 'o1' }, { id: 'o2' }],
    },
  ],
  customTemplate: { id: 'ct1', isActive: true, textTokens: [{ id: 'k1' }, { id: 'k2' }] },
};

const BARE: Product = {
  ...PRODUCT,
  description: null,
  purchaseNotice: '  ',
  salePrice: null,
  preparationTimeMinutes: 0,
  images: [],
  categories: [],
  tags: [],
  optionGroups: [],
  customTemplate: null,
};

const BUYER: SellerProductBuyerPreviewQuery = {
  productDetail: {
    id: '7',
    name: '그림일기 케이크',
    description: null,
    purchaseNotice: '수평을 유지해 조심히 이동해 주세요',
    images: ['https://img/1.jpg'],
    regularPrice: 35000,
    salePrice: 33000,
    discountRate: 6,
    optionGroups: [
      {
        id: 'g1',
        name: '케이크 사이즈',
        description: null,
        items: [
          { id: 'o1', title: '0호', description: null, priceDelta: 0 },
          { id: 'o2', title: '1호', description: '15cm', priceDelta: 5000 },
        ],
      },
    ],
  },
  productReviews: { totalCount: 3 },
};

const detailOk = (product: Product = PRODUCT) =>
  gqlOk('SellerProductDetail', { sellerProduct: product });

const stub = () => null;
function open() {
  const queryClient = createTestQueryClient();
  return renderRouter(
    {
      products: stub,
      'products/[id]/index': ProductDetailScreen,
      'products/[id]/edit': stub,
      'products/[id]/images': stub,
      'products/[id]/options': stub,
      'products/[id]/custom-template': stub,
    },
    {
      initialUrl: '/products/7',
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );
}

const notFound = {
  message: '상품을 찾을 수 없습니다.',
  code: 'PRODUCT_NOT_FOUND',
  classification: 'NOT_FOUND',
  statusCode: 404,
};

describe('ProductDetailScreen', () => {
  beforeEach(() => {
    jest.mocked(toast.error).mockClear();
    jest.mocked(toast.success).mockClear();
  });

  it('요약·기본 정보·분류·옵션·관리 섹션을 그린다', async () => {
    server.use(detailOk());
    await open();
    expect(await screen.findByRole('header', { name: '그림일기 케이크' })).toBeTruthy();
    expect(screen.getByText('6%')).toBeTruthy();
    expect(screen.getByText('33,000원')).toBeTruthy();
    expect(screen.getByText('35,000원')).toBeTruthy();
    expect(screen.getByText(BROWSE_COPY.activeOn)).toBeTruthy();
    expect(screen.getByText(PRODUCT.description!)).toBeTruthy();
    expect(screen.getByText(PRODUCT.purchaseNotice!)).toBeTruthy();
    expect(screen.getByText('2시간')).toBeTruthy();
    expect(screen.getByLabelText('크리스마스')).toBeTruthy();
    expect(screen.getByText('#트리')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '케이크 사이즈, 필수 · 1개 선택, 2개' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '이미지 관리, 5장' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '커스텀 문구, 문구 슬롯 2개, 사용 중' }),
    ).toBeTruthy();
  });

  it('비어 있는 항목은 안내 문구로 채운다', async () => {
    server.use(detailOk(BARE));
    await open();
    expect(await screen.findByText('등록한 이미지가 없어요')).toBeTruthy();
    expect(screen.queryByText('6%')).toBeNull();
    expect(screen.getAllByText(BROWSE_COPY.noText)).toHaveLength(3);
    expect(screen.getByText('즉시 제작')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^옵션 그룹 추가/ })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '커스텀 문구, 등록하지 않았어요, 사용 안 함' }),
    ).toBeTruthy();
  });

  it('썸네일을 누르면 그 장을 고른다', async () => {
    server.use(detailOk());
    await open();
    const third = await screen.findByRole('button', { name: '3번째 이미지 보기' });
    expect(screen.getByRole('button', { name: '1번째 이미지 보기' })).toBeSelected();
    await fireEvent.press(third);
    expect(third).toBeSelected();
  });

  it.each([
    ['수정', '/products/7/edit'],
    ['편집 ›', '/products/7/options'],
    ['이미지 관리, 5장', '/products/7/images'],
    ['커스텀 문구, 문구 슬롯 2개, 사용 중', '/products/7/custom-template'],
  ])('"%s"는 %s로 간다', async (name, path) => {
    server.use(detailOk());
    const router = open();
    await router;
    await fireEvent.press(await screen.findByRole('button', { name }));
    expect(router.getPathname()).toBe(path);
  });

  it('노출 스위치는 바로 반영하고 상태 문구도 바꾼다', async () => {
    let current = PRODUCT;
    let sent: unknown;
    server.use(
      graphql.query('SellerProductDetail', () =>
        HttpResponse.json({ data: { sellerProduct: current } }),
      ),
      graphql.mutation('SellerProductSetActive', ({ variables }) => {
        sent = variables;
        current = { ...PRODUCT, isActive: false };
        return HttpResponse.json({
          data: { sellerSetProductActive: { id: '7', isActive: false } },
        });
      }),
    );
    await open();
    await fireEvent.press(await screen.findByRole('switch', { name: '구매자에게 노출' }));
    expect(await screen.findByText(BROWSE_COPY.activeOff)).toBeTruthy();
    expect(sent).toEqual({ input: { productId: '7', isActive: false } });
  });

  it('삭제를 확정하면 지우고 목록으로 돌아가 토스트를 띄운다', async () => {
    let deleted: unknown;
    server.use(
      detailOk(),
      graphql.mutation('SellerProductDelete', ({ variables }) => {
        deleted = variables;
        return HttpResponse.json({ data: { sellerDeleteProduct: true } });
      }),
    );
    const router = open();
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '상품 삭제' }));
    expect(screen.getByRole('header', { name: BROWSE_COPY.deleteTitle })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '삭제하기' }));
    await waitFor(() => expect(router.getPathname()).toBe('/products'));
    expect(deleted).toEqual({ productId: '7' });
    expect(toast.success).toHaveBeenCalledWith(BROWSE_COPY.deleted);
  });

  it('삭제가 실패하면 머무르며 이유를 알린다', async () => {
    server.use(
      detailOk(),
      gqlError('SellerProductDelete', {
        message: '서버 오류',
        code: 'INTERNAL_ERROR',
        classification: 'INTERNAL_SERVER_ERROR',
      }),
    );
    const router = open();
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '삭제하기' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      ),
    );
    expect(router.getPathname()).toBe('/products/7');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('없는 상품이면 안내하고 목록으로 돌려보낸다', async () => {
    server.use(gqlError('SellerProductDetail', notFound));
    const router = open();
    await router;
    await waitFor(() => expect(router.getPathname()).toBe('/products'));
    expect(toast.error).toHaveBeenCalledWith(BROWSE_COPY.notFound);
  });

  it('불러오지 못하면 다시 시도로 복구한다', async () => {
    server.use(graphql.query('SellerProductDetail', () => HttpResponse.error()));
    await open();
    expect(await screen.findByText('불러오지 못했어요')).toBeTruthy();
    server.use(detailOk());
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('header', { name: '그림일기 케이크' })).toBeTruthy();
  });

  it('구매자 화면으로 보기는 구매자용 상세와 후기 수를 띄우고 닫는다', async () => {
    let reviews: unknown;
    server.use(
      detailOk(),
      graphql.query('SellerProductBuyerPreview', ({ variables }) => {
        reviews = variables;
        return HttpResponse.json({ data: BUYER });
      }),
    );
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '구매자 화면으로 보기' }));
    const sheet = within(screen.getByTestId('buyer-preview'));
    expect(await sheet.findByRole('tab', { name: '후기(3)' })).toBeTruthy();
    expect(sheet.getByText(BUYER.productDetail.purchaseNotice!)).toBeTruthy();
    expect(sheet.getByText('0호\n1호 +5,000원\n15cm')).toBeTruthy();
    expect(reviews).toEqual({ productId: '7', reviews: { productId: '7', limit: 1 } });

    await fireEvent.press(sheet.getByRole('tab', { name: '후기(3)' }));
    expect(sheet.getByText('구매자 후기 3개는 매장 › 리뷰에서 볼 수 있어요')).toBeTruthy();
    await fireEvent.press(sheet.getByRole('button', { name: '닫기' }));
    expect(screen.queryByTestId('buyer-preview')).toBeNull();
  });

  it('숨김 상품은 구매자 화면이 NOT_FOUND라 보이지 않는다고 안내한다', async () => {
    server.use(
      detailOk({ ...PRODUCT, isActive: false }),
      gqlError('SellerProductBuyerPreview', notFound),
    );
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '구매자 화면으로 보기' }));
    expect(await screen.findByText(BROWSE_COPY.buyerHiddenTitle)).toBeTruthy();
    expect(screen.queryByText('불러오지 못했어요')).toBeNull();
  });
});
