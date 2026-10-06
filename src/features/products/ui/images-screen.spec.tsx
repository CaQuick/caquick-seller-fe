import { launchImageLibraryAsync } from 'expo-image-picker';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import type * as MockReact from 'react';
import type * as MockRN from 'react-native';
import { toast } from 'sonner-native';

import { type SellerProductDetailQuery } from '@/graphql/generated/graphql';
import { mockFileSizes } from '@/test/mocks';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { IMAGES_COPY } from '../model/images-order';
import { ProductImagesScreen } from './images-screen';

jest.mock('sonner-native', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
// expo-router testing-library가 reanimated를 mock으로 바꿔 sortables가 돌지 않는다 — 끌어 놓기는 뒤집기 버튼으로 흉내 낸다
interface MockGridProps {
  data: unknown[];
  keyExtractor: (item: unknown) => string;
  renderItem: (info: { item: unknown; index: number }) => MockReact.ReactNode;
  onDragEnd: (params: { data: unknown[] }) => void;
}
jest.mock('react-native-sortables', () => {
  const { createElement } = jest.requireActual<typeof MockReact>('react');
  const { Pressable, View } = jest.requireActual<typeof MockRN>('react-native');
  const Grid = ({ data, keyExtractor, renderItem, onDragEnd }: MockGridProps) =>
    createElement(
      View,
      null,
      ...data.map((item, index) =>
        createElement(View, { key: keyExtractor(item) }, renderItem({ item, index })),
      ),
      createElement(Pressable, {
        testID: 'reverse',
        onPress: () => onDragEnd({ data: [...data].reverse() }),
      }),
    );
  return { __esModule: true, default: { Grid } };
});
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: jest.fn(),
      renderAsync: () =>
        Promise.resolve({ saveAsync: () => Promise.resolve({ uri: 'file:///cache/p.jpg' }) }),
    }),
  },
}));

type Image = SellerProductDetailQuery['sellerProduct']['images'][number];
const img = (n: number): Image => ({ id: `i${n}`, imageUrl: `https://img/${n}.jpg`, sortOrder: n });

const FAIL = graphqlError({
  message: '이미지는 최소 1장 이상이어야 합니다.',
  code: 'PRODUCT_IMAGE_MIN_REQUIRED',
  classification: 'BAD_REQUEST',
  statusCode: 400,
});

/** 서버 상태를 들고 상세 조회·이미지 mutation에 답한다 */
function serve(initial: Image[], failDelete = false) {
  let images = initial;
  const calls: Record<string, Record<string, unknown>[]> = {};
  server.use(
    graphql.operation(({ operationName, variables }) => {
      (calls[operationName] ??= []).push(variables);
      switch (operationName) {
        case 'SellerProductDetail':
          return HttpResponse.json({
            data: {
              sellerProduct: {
                id: '7',
                name: '그림일기 케이크',
                description: null,
                purchaseNotice: null,
                regularPrice: 35000,
                salePrice: null,
                preparationTimeMinutes: 120,
                isActive: true,
                images,
                categories: [],
                tags: [],
                optionGroups: [],
                customTemplate: null,
              },
            },
          });
        case 'SellerProductReorderImages': {
          const ids = (variables.input as { imageIds: string[] }).imageIds;
          images = ids.map((id, i) => ({ ...images.find((x) => x.id === id)!, sortOrder: i }));
          return HttpResponse.json({ data: { sellerReorderProductImages: images } });
        }
        case 'SellerProductDeleteImage':
          if (failDelete) return HttpResponse.json({ data: null, errors: [FAIL] });
          images = images.filter((x) => x.id !== variables.imageId);
          return HttpResponse.json({ data: { sellerDeleteProductImage: true } });
        case 'SellerUploadsCreateUploadUrl': {
          const n = calls[operationName].length;
          return HttpResponse.json({
            data: {
              sellerCreateUploadUrl: {
                uploadUrl: `https://s3/${n}`,
                publicUrl: `https://cdn/${n}.jpg`,
              },
            },
          });
        }
        case 'SellerProductAddImage': {
          const url = (variables.input as { imageUrl: string }).imageUrl;
          const added = { id: `n${images.length}`, imageUrl: url, sortOrder: images.length };
          images = [...images, added];
          return HttpResponse.json({ data: { sellerAddProductImage: { id: added.id } } });
        }
        default:
          return undefined;
      }
    }),
  );
  return calls;
}

function open() {
  const queryClient = createTestQueryClient();
  return renderRouter(
    { 'products/[id]/images': ProductImagesScreen },
    {
      initialUrl: '/products/7/images',
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );
}

const saveButton = () => screen.getByRole('button', { name: IMAGES_COPY.saveOrder });

describe('ProductImagesScreen', () => {
  beforeEach(() => {
    jest.mocked(toast.error).mockClear();
    jest.mocked(toast.success).mockClear();
    mockFileSizes.set('file:///cache/p.jpg', 2048);
  });

  it('첫 칸에 대표 배지를, 마지막 칸에 남은 수와 추가를 둔다. 순서를 안 바꾸면 저장을 막는다', async () => {
    serve([img(1), img(2), img(3)]);
    await open();
    expect(await screen.findByLabelText('상품 이미지 1')).toBeTruthy();
    expect(screen.getAllByText(IMAGES_COPY.cover)).toHaveLength(1);
    expect(screen.getByRole('button', { name: '이미지 추가 (3/6)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '상품 이미지 3 삭제' })).toBeTruthy();
    expect(saveButton()).toBeDisabled();
  });

  it('끌어 놓은 뒤 순서 저장은 이미지 id 전체를 새 순서로 보낸다', async () => {
    const calls = serve([img(3), img(1), img(2)].map((x, i) => ({ ...x, sortOrder: i })));
    await open();
    await screen.findByLabelText('상품 이미지 1');
    await fireEvent.press(screen.getByTestId('reverse'));
    expect(saveButton()).toBeEnabled();
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(IMAGES_COPY.orderSaved));
    // 추가 칸은 끌어도 순서에 섞이지 않는다
    expect(calls.SellerProductReorderImages).toEqual([
      { input: { productId: '7', imageIds: ['i2', 'i1', 'i3'] } },
    ]);
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });

  it('삭제는 바로 보내고 다시 불러온다', async () => {
    const calls = serve([img(1), img(2)]);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '상품 이미지 2 삭제' }));
    await waitFor(() => expect(screen.queryByLabelText('상품 이미지 2')).toBeNull());
    expect(calls.SellerProductDeleteImage).toEqual([{ imageId: 'i2' }]);
    // 남은 1장은 지울 수 없다
    expect(screen.queryByRole('button', { name: '상품 이미지 1 삭제' })).toBeNull();
    expect(screen.getByText(IMAGES_COPY.lastImage)).toBeTruthy();
  });

  it('삭제가 거절되면 이유를 알리고 그대로 둔다', async () => {
    serve([img(1), img(2)], true);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '상품 이미지 2 삭제' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('이미지는 최소 1장 이상이어야 합니다.'),
    );
    expect(screen.getByLabelText('상품 이미지 2')).toBeTruthy();
  });

  it('추가는 남은 칸만큼 골라 올린 뒤 등록하고, 끌어 둔 순서는 지킨다', async () => {
    const calls = serve([1, 2, 3, 4].map(img));
    jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///a.jpg', width: 800, height: 800 },
        { uri: 'file:///b.jpg', width: 800, height: 800 },
      ],
    } as never);
    await open();
    await screen.findByLabelText('상품 이미지 1');
    await fireEvent.press(screen.getByTestId('reverse'));
    await fireEvent.press(screen.getByRole('button', { name: '이미지 추가 (4/6)' }));
    expect(jest.mocked(launchImageLibraryAsync).mock.calls[0]?.[0]).toMatchObject({
      selectionLimit: 2,
    });
    await waitFor(() => expect(screen.getByLabelText('상품 이미지 6')).toBeTruthy());
    expect(calls.SellerProductAddImage?.map((v) => v.input)).toEqual([
      { productId: '7', imageUrl: 'https://cdn/1.jpg' },
      { productId: '7', imageUrl: 'https://cdn/2.jpg' },
    ]);
    expect(screen.queryByRole('button', { name: /이미지 추가/ })).toBeNull();
    await fireEvent.press(saveButton());
    await waitFor(() => expect(calls.SellerProductReorderImages).toHaveLength(1));
    expect(calls.SellerProductReorderImages?.[0]).toEqual({
      input: { productId: '7', imageIds: ['i4', 'i3', 'i2', 'i1', 'n4', 'n5'] },
    });
  });
});
