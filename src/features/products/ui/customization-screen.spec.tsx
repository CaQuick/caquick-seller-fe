import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import { toast } from 'sonner-native';

import { type SellerProductDetailQuery } from '@/graphql/generated/graphql';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { CUSTOMIZATION_COPY as COPY } from '../model/customization';
import { ProductCustomizationScreen } from './customization-screen';

jest.mock('sonner-native', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

type Product = SellerProductDetailQuery['sellerProduct'];

const PRODUCT: Product = {
  id: '7',
  name: '그림일기 케이크',
  description: null,
  purchaseNotice: null,
  regularPrice: 35000,
  salePrice: null,
  preparationTimeMinutes: 60,
  isActive: true,
  images: [],
  categories: [],
  tags: [],
  optionGroups: [
    {
      id: 'g1',
      name: '사이즈',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      isActive: true,
      threeDCategory: 'SIZE',
      optionItems: [{ id: 'o1' }],
    },
  ],
  customMode: 'SLOT',
  customReadiness: [
    { mode: 'NONE', issues: [] },
    { mode: 'SLOT', issues: [] },
    {
      mode: 'THREE_D',
      issues: [{ code: 'THREE_D_GROUP_MISSING', message: '모양 3D 항목 옵션 그룹이 필요해요.' }],
    },
  ],
  customTemplate: { id: 'ct1', freeEditEnabled: true, textTokens: [{ id: 'k1' }, { id: 'k2' }] },
};

/** 조회는 고정 상품, mutation은 변수를 기록한다. fail에 든 operation은 오류로 답한다 */
function serve(product: Product = PRODUCT, fail: string[] = []) {
  const calls: Record<string, unknown[]> = {};
  server.use(
    graphql.operation(({ operationName, variables }) => {
      (calls[operationName] ??= []).push(variables);
      if (operationName === 'SellerProductDetail')
        return HttpResponse.json({ data: { sellerProduct: product } });
      if (fail.includes(operationName))
        return HttpResponse.json({
          data: null,
          errors: [
            graphqlError({
              message: '모양 3D 항목 옵션 그룹이 필요해요.',
              code: 'CUSTOM_PRODUCT_NOT_READY',
              classification: 'BAD_USER_INPUT',
              statusCode: 400,
            }),
          ],
        });
      return HttpResponse.json({ data: {} });
    }),
  );
  return calls;
}

const stub = () => null;
function open() {
  const queryClient = createTestQueryClient();
  return renderRouter(
    {
      'products/[id]/customization': ProductCustomizationScreen,
      'products/[id]/custom-template': stub,
      'products/[id]/options': stub,
    },
    {
      initialUrl: '/products/7/customization',
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );
}

const radio = (label: string) => screen.getByRole('radio', { name: `${COPY.title} ${label}` });

describe('ProductCustomizationScreen', () => {
  beforeEach(() => {
    jest.mocked(toast.error).mockClear();
    jest.mocked(toast.success).mockClear();
  });

  it('공통 안내와 방식 카드 세 장을 그리고, 준비가 덜 된 방식은 이슈와 함께 막는다', async () => {
    serve();
    await open();
    expect(await screen.findByText(COPY.guide)).toBeTruthy();
    expect(radio('슬롯형')).toBeChecked();
    expect(radio('슬롯형')).toBeDisabled();
    expect(radio('없음')).not.toBeDisabled();
    expect(radio('3D')).toBeDisabled();
    expect(screen.getByText(COPY.notReady)).toBeTruthy();
    expect(screen.getByText('· 모양 3D 항목 옵션 그룹이 필요해요.')).toBeTruthy();
    expect(screen.getByText('문구 자리 2개 · 자유 편집 켬')).toBeTruthy();
    expect(screen.getByText('3D 항목 옵션: 크기')).toBeTruthy();
    expect(screen.getByText(COPY.noFreeEdit)).toBeTruthy();
    expect(screen.queryByText(COPY.brokenNow)).toBeNull();
  });

  it('준비된 방식을 고르면 바로 바꾸고 다시 받는다', async () => {
    const calls = serve();
    await open();
    await screen.findByText(COPY.guide);
    await fireEvent.press(radio('없음'));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('커스텀 방식을 없음으로 바꿨어요'),
    );
    expect(calls.SellerProductSetCustomMode).toEqual([{ productId: '7', customMode: 'NONE' }]);
    await waitFor(() => expect(calls.SellerProductDetail).toHaveLength(2));
  });

  it('서버가 거절하면 그 문구를 알린다', async () => {
    serve({ ...PRODUCT, customReadiness: [] }, ['SellerProductSetCustomMode']);
    await open();
    await screen.findByText(COPY.guide);
    await fireEvent.press(radio('3D'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('모양 3D 항목 옵션 그룹이 필요해요.'),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('지금 방식에 준비 이슈가 있으면 주문이 거절된다고 알린다', async () => {
    serve({
      ...PRODUCT,
      customReadiness: [
        {
          mode: 'SLOT',
          issues: [{ code: 'SLOT_NOTHING_TO_EDIT', message: '문구 자리가 없어요.' }],
        },
      ],
    });
    await open();
    expect(await screen.findByText(COPY.brokenNow)).toBeTruthy();
    expect(screen.getByText('· 문구 자리가 없어요.')).toBeTruthy();
  });

  it('3D 기본 세트를 불러오지 못하면 알린다', async () => {
    serve(PRODUCT, ['SellerProductApplyThreeDPreset']);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: COPY.preset }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('3D 기본 세트를 불러오고 다시 받는다', async () => {
    const calls = serve();
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: COPY.preset }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(COPY.presetDone));
    expect(calls.SellerProductApplyThreeDPreset).toEqual([{ productId: '7' }]);
    await waitFor(() => expect(calls.SellerProductDetail).toHaveLength(2));
  });

  it.each([
    [COPY.slotSettings, '/products/7/custom-template'],
    [COPY.optionSettings, '/products/7/options'],
  ])('"%s"는 %s로 간다', async (name, path) => {
    serve();
    const router = open();
    await router;
    await fireEvent.press(await screen.findByRole('button', { name }));
    expect(router.getPathname()).toBe(path);
  });
});
