import { router as nav, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import { Text } from 'react-native';
import { toast } from 'sonner-native';

import { type SellerProductDetailQuery } from '@/graphql/generated/graphql';
import { gqlError, gqlOk, graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { EDIT_COPY } from '../model/edit-form';
import { ProductEditScreen } from './edit-screen';

jest.mock('sonner-native', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));

const PRODUCT: SellerProductDetailQuery['sellerProduct'] = {
  id: '7',
  name: '그림일기 케이크',
  description: '주문 제작 케이크예요',
  purchaseNotice: null,
  regularPrice: 35000,
  salePrice: 33000,
  preparationTimeMinutes: 120,
  isActive: true,
  images: [
    { id: 'i1', imageUrl: 'https://img/1.jpg', sortOrder: 0 },
    { id: 'i2', imageUrl: 'https://img/2.jpg', sortOrder: 1 },
  ],
  categories: [
    { id: '2', name: '크리스마스' },
    { id: '4', name: '기타' },
  ],
  tags: [{ id: 't1', name: '눈' }],
  optionGroups: [],
  customTemplate: null,
};

const CATEGORIES = [
  { id: '1', name: '생일', categoryType: 'EVENT', sortOrder: 2 },
  { id: '2', name: '크리스마스', categoryType: 'EVENT', sortOrder: 1 },
  { id: '3', name: '입체', categoryType: 'STYLE', sortOrder: 1 },
  { id: '4', name: '기타', categoryType: 'OTHER', sortOrder: 1 },
];

const FAIL = graphqlError({
  message: '잠시 후 다시 시도해 주세요.',
  code: 'TEMPORARY_UNAVAILABLE',
  classification: 'INTERNAL_SERVER_ERROR',
  statusCode: 503,
});

/** 변수를 기록한다. fail(n)이 참인 n번째 호출은 오류로 답한다 */
function record(operation: string, data: object, fail?: (n: number) => boolean) {
  const calls: Record<string, unknown>[] = [];
  server.use(
    graphql.operation(({ operationName, variables }) => {
      if (operationName !== operation) return undefined;
      calls.push(variables);
      if (fail?.(calls.length)) return HttpResponse.json({ data: null, errors: [FAIL] });
      return HttpResponse.json({ data });
    }),
  );
  return calls;
}

function open(initialUrl = '/products/7/edit') {
  const queryClient = createTestQueryClient();
  return renderRouter(
    {
      _layout: () => <Stack />,
      products: () => <Text>상품 목록</Text>,
      'products/[id]/edit': ProductEditScreen,
      'products/[id]/images': () => <Text>이미지 관리 화면</Text>,
    },
    {
      initialUrl,
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );
}

const ok = () =>
  server.use(
    gqlOk('SellerProductDetail', { sellerProduct: PRODUCT }),
    gqlOk('SellerProductsFilterCategories', { categories: CATEGORIES }),
  );
const saveButton = () => screen.getByRole('button', { name: EDIT_COPY.save });

describe('ProductEditScreen', () => {
  beforeEach(() => {
    jest.mocked(toast.error).mockClear();
    jest.mocked(toast.success).mockClear();
  });

  it('상품 값을 채워 그리고, 바꾼 것이 없으면 저장을 막는다', async () => {
    ok();
    await open();
    expect(await screen.findByDisplayValue('그림일기 케이크')).toBeTruthy();
    expect(screen.getByLabelText('정가')).toHaveDisplayValue('35,000');
    expect(screen.getByLabelText('할인가')).toHaveDisplayValue('33,000');
    expect(screen.getByLabelText('제작 소요 시간')).toHaveDisplayValue('120');
    expect(screen.getByRole('button', { name: '이벤트별 카테고리' })).toHaveAccessibilityValue({
      text: '크리스마스',
    });
    expect(screen.getByRole('button', { name: '스타일별 카테고리' })).toHaveAccessibilityValue({
      text: '선택 안 함',
    });
    expect(screen.getByText('# 눈')).toBeTruthy();
    expect(screen.getByLabelText('상품 이미지 2')).toBeTruthy();
    expect(saveButton()).toBeDisabled();
  });

  it('바꾼 필드만 부분 수정으로 보내고, 카테고리·태그는 건드리지 않는다', async () => {
    ok();
    const updates = record('SellerProductUpdate', { sellerUpdateProduct: { id: '7' } });
    const categories = record('SellerProductSetCategories', {});
    const tags = record('SellerProductSetTags', {});
    const router = open();
    await router;
    await fireEvent.changeText(await screen.findByLabelText('정가'), '36,000');
    await fireEvent.changeText(screen.getByLabelText('제작 소요 시간'), '90');
    await fireEvent.press(saveButton());
    await waitFor(() => expect(router.getPathname()).toBe('/products'));
    expect(updates).toEqual([
      { input: { productId: '7', regularPrice: 36000, preparationTimeMinutes: 90 } },
    ]);
    expect(categories).toHaveLength(0);
    expect(tags).toHaveLength(0);
    expect(toast.success).toHaveBeenCalledWith(EDIT_COPY.saved);
  });

  it('할인가가 정가 이상이면 바로 알리고 저장을 보내지 않는다', async () => {
    ok();
    const updates = record('SellerProductUpdate', { sellerUpdateProduct: { id: '7' } });
    await open();
    await fireEvent.changeText(await screen.findByLabelText('할인가'), '38000');
    expect(screen.getByText('할인가는 정가보다 작아야 해요')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('제작 소요 시간'), '');
    expect(screen.queryByText('1분 이상 입력해 주세요')).toBeNull();
    await fireEvent.press(saveButton());
    expect(await screen.findByText('1분 이상 입력해 주세요')).toBeTruthy();
    expect(updates).toHaveLength(0);
  });

  it('카테고리를 바꾸면 고를 수 없는 기존 연결을 남긴 채 통째로 설정한다', async () => {
    ok();
    const categories = record('SellerProductSetCategories', {
      sellerSetProductCategories: { id: '7' },
    });
    const router = open();
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '스타일별 카테고리' }));
    const sheet = within(screen.getByTestId('category-sheet'));
    await fireEvent.press(await sheet.findByRole('button', { name: '입체' }));
    await fireEvent.press(sheet.getByRole('button', { name: '등록하기' }));
    await fireEvent.press(saveButton());
    await waitFor(() => expect(router.getPathname()).toBe('/products'));
    expect(categories).toEqual([{ input: { productId: '7', categoryIds: ['2', '3', '4'] } }]);
  });

  it('중간 단계가 실패하면 알리고, 다시 저장하면 남은 단계만 보낸다', async () => {
    ok();
    const updates = record('SellerProductUpdate', { sellerUpdateProduct: { id: '7' } });
    const tags = record(
      'SellerProductSetTags',
      { sellerSetProductTagsByName: { id: '7' } },
      (n) => n === 1,
    );
    record('SellerProductTagSearch', { sellerSearchTags: [] });
    const router = open();
    await router;
    await fireEvent.changeText(await screen.findByLabelText('상품명'), '첫눈 케이크');
    await fireEvent.press(screen.getByRole('button', { name: '키워드 편집' }));
    const sheet = within(screen.getByTestId('tag-sheet'));
    await fireEvent.changeText(sheet.getByLabelText('태그 입력'), '트리 ');
    await fireEvent.press(sheet.getByRole('button', { name: '확인' }));

    await fireEvent.press(saveButton());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '키워드를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      ),
    );
    expect(router.getPathname()).toBe('/products/7/edit');

    await fireEvent.press(saveButton());
    await waitFor(() => expect(router.getPathname()).toBe('/products'));
    expect(updates).toEqual([{ input: { productId: '7', name: '첫눈 케이크' } }]);
    expect(tags).toEqual([
      { input: { productId: '7', names: ['눈', '트리'] } },
      { input: { productId: '7', names: ['눈', '트리'] } },
    ]);
  });

  it('바꾼 것이 없으면 바로 뒤로 간다', async () => {
    ok();
    const router = open('/products');
    await router;
    await act(() => Promise.resolve(nav.push('/products/7/edit')));
    await fireEvent.press(await screen.findByRole('button', { name: '뒤로 가기' }));
    await waitFor(() => expect(router.getPathname()).toBe('/products'));
  });

  it('바꾼 채 뒤로 가면 확인하고, 나가기를 고르면 떠난다', async () => {
    ok();
    const router = open('/products');
    await router;
    await act(() => Promise.resolve(nav.push('/products/7/edit')));
    await fireEvent.changeText(await screen.findByLabelText('상품명'), '바뀐 이름');
    await fireEvent.press(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(screen.getByRole('header', { name: EDIT_COPY.leaveTitle })).toBeTruthy();
    expect(router.getPathname()).toBe('/products/7/edit');
    await fireEvent.press(screen.getByRole('button', { name: EDIT_COPY.leaveConfirm }));
    await waitFor(() => expect(router.getPathname()).toBe('/products'));
  });

  it('이미지 링크는 이미지 관리로 간다', async () => {
    ok();
    const router = open();
    await router;
    await fireEvent.press(await screen.findByRole('link', { name: EDIT_COPY.imagesLink }));
    expect(router.getPathname()).toBe('/products/7/images');
  });

  it('지워진 상품이면 알리고 목록으로 돌아간다', async () => {
    server.use(
      gqlError('SellerProductDetail', {
        message: '상품을 찾을 수 없습니다.',
        code: 'PRODUCT_NOT_FOUND',
        classification: 'NOT_FOUND',
        statusCode: 404,
      }),
      gqlOk('SellerProductsFilterCategories', { categories: CATEGORIES }),
    );
    const router = open();
    await router;
    await waitFor(() => expect(router.getPathname()).toBe('/products'));
    expect(toast.error).toHaveBeenCalledWith('상품을 찾을 수 없어요');
  });

  it('그 밖의 오류는 다시 시도를 보여 주고, 누르면 다시 불러온다', async () => {
    let n = 0;
    server.use(
      graphql.query('SellerProductDetail', () =>
        ++n === 1
          ? HttpResponse.json({ data: null, errors: [FAIL] })
          : HttpResponse.json({ data: { sellerProduct: PRODUCT } }),
      ),
      gqlOk('SellerProductsFilterCategories', { categories: CATEGORIES }),
    );
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: /다시 시도/ }));
    expect(await screen.findByDisplayValue('그림일기 케이크')).toBeTruthy();
  });
});
