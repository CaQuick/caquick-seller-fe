import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { graphql, HttpResponse } from 'msw';
import { Pressable, Text } from 'react-native';

import { type CakeViewer, type YawRequest } from '@/features/custom';
import { type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { gqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { OrderDesignScreen } from './order-design-screen';

type Item = SellerOrderDetailQuery['sellerOrder']['items'][number];
type ViewerProps = Parameters<typeof CakeViewer>[0];

const mockViewer = jest.fn((props: ViewerProps) => (
  <Pressable accessibilityRole="button" onPress={() => props.onError(new Error('GL'))}>
    <Text>{`3D ${props.request.yaw.toFixed(3)}`}</Text>
  </Pressable>
));
jest.mock('@/features/custom', () => ({
  ...jest.requireActual<object>('@/features/custom'),
  CakeViewer: (props: ViewerProps) => mockViewer(props),
}));

const KINDS = [
  'THREE_D_TOP',
  'THREE_D_FRONT',
  'THREE_D_BACK',
  'THREE_D_LEFT',
  'THREE_D_RIGHT',
] as const;
const DESIGN: NonNullable<Item['threeDDesign']> = {
  schemaVersion: 1,
  basic: { shape: 'heart', size: 'mini', design: 'wave', flavor: null, sheetColor: 'pink' },
  top: [],
  side: [],
};
const item = (id: string, patch: Partial<Item> = {}): Item => ({
  id,
  productName: `케이크 ${id}`,
  quantity: 1,
  optionItems: [],
  customMode: 'THREE_D',
  customPreviewImageUrl: `https://img/${id}-top.png`,
  customBaseImageUrl: null,
  customImages: KINDS.map((kind, i) => ({
    id: `${id}${i}`,
    kind,
    imageUrl: `https://img/${id}-${i}.png`,
  })),
  threeDDesign: DESIGN,
  customTexts: [],
  freeEdits: [],
  ...patch,
});
const CATALOG = {
  revision: 1,
  textColorPresets: [],
  optionChoices: [
    {
      key: 'size.mini',
      category: 'SIZE',
      value: 'mini',
      label: '미니',
      defaultPriceDelta: 0,
      renderScale: 0.82,
      selectable: true,
    },
  ],
  sheetColors: [{ key: 'pink', hex: '#FFC2CF' }],
  decos: [],
};

const FAIL = { message: '서버 오류', classification: 'INTERNAL_SERVER_ERROR' };

function serve(items: Item[], { catalogFails = false, orderFails = false } = {}) {
  server.use(
    orderFails
      ? gqlError('SellerOrderDetail', FAIL)
      : graphql.query('SellerOrderDetail', () =>
          HttpResponse.json({ data: { sellerOrder: { id: '7', items } } }),
        ),
    catalogFails
      ? gqlError('SellerCustomCatalog', FAIL)
      : graphql.query('SellerCustomCatalog', () =>
          HttpResponse.json({ data: { customThreeDCatalog: CATALOG } }),
        ),
  );
}

function open(url = '/orders/7/design?itemId=b') {
  const queryClient = createTestQueryClient();
  return renderRouter(
    { 'orders/[id]/design': OrderDesignScreen },
    {
      initialUrl: url,
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );
}

const lastRequest = () => mockViewer.mock.lastCall![0].request;

describe('OrderDesignScreen', () => {
  beforeEach(() => mockViewer.mockClear());

  it('고른 품목을 옆면 정면부터 3D로 보여 주고, 앞·뒤·왼쪽·오른쪽은 캡처 자세로 돌린다', async () => {
    serve([item('a'), item('b')]);
    await open();
    expect(await screen.findByText('3D 0.000')).toBeTruthy();
    expect(screen.getByText('케이크 b')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '3D 보기' })).toBeSelected();
    expect(mockViewer.mock.lastCall![0].render).toMatchObject({
      shape: 'heart',
      color: '#FFC2CF',
      scale: 0.82,
    });

    await fireEvent.press(screen.getByRole('button', { name: '왼쪽' }));
    expect(lastRequest().yaw).toBeCloseTo(Math.PI / 2, 9);
    const left: YawRequest = lastRequest();
    // 같은 자세를 다시 눌러도(끌어 돌린 뒤) 새 요청으로 맞춘다
    await fireEvent.press(screen.getByRole('button', { name: '왼쪽' }));
    expect(lastRequest()).not.toBe(left);
    await fireEvent.press(screen.getByRole('button', { name: '오른쪽' }));
    expect(lastRequest().yaw).toBeCloseTo(-Math.PI / 2, 9);
    await fireEvent.press(screen.getByRole('button', { name: '뒤' }));
    expect(lastRequest().yaw).toBeCloseTo(Math.PI, 9);
  });

  it('구매자 캡처는 5장을 윗면부터 넘기고, 누르면 전체 화면으로 연다', async () => {
    serve([item('b')]);
    await open();
    await fireEvent.press(await screen.findByRole('tab', { name: '구매자 캡처' }));
    expect(screen.queryByText(/^3D \d/)).toBeNull();
    expect(screen.getByText('윗면 · 1/5')).toBeTruthy();
    const pager = screen.getByTestId('capture-pager');
    await fireEvent(pager.parent!, 'layout', {
      nativeEvent: { layout: { width: 320, height: 320 } },
    });
    await fireEvent(pager, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 640, y: 0 } },
    });
    expect(screen.getByText('뒤 · 3/5')).toBeTruthy();
    await fireEvent.press(screen.getByRole('imagebutton', { name: '왼쪽 크게 보기' }));
    expect(await screen.findByText('왼쪽 · 4/5')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByText('왼쪽 · 4/5')).toBeNull();
  });

  it('GL이 실패하면 안내와 함께 캡처만 보여 준다', async () => {
    serve([item('b')]);
    await open();
    await act(async () => {
      await fireEvent.press(await screen.findByText('3D 0.000'));
    });
    expect(await screen.findByText('3D를 그리지 못해 구매자 캡처로 보여 드려요')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: '3D 보기' })).toBeNull();
    expect(screen.getByText('윗면 · 1/5')).toBeTruthy();
  });

  it.each([
    [
      '디자인이 없으면',
      { threeDDesign: null },
      '저장된 3D 디자인이 없어 구매자 캡처로 보여 드려요',
    ],
    [
      '이 앱이 모르는 모양이면',
      { threeDDesign: { ...DESIGN, basic: { ...DESIGN.basic, shape: 'moon' } } },
      '앱을 업데이트하면 이 디자인을 3D로 볼 수 있어요',
    ],
  ])('%s 캡처만 보여 준다', async (_, patch, notice) => {
    serve([item('b', patch)]);
    await open();
    expect(await screen.findByText(notice)).toBeTruthy();
    expect(screen.getByText('윗면 · 1/5')).toBeTruthy();
    expect(mockViewer).not.toHaveBeenCalled();
  });

  it('카탈로그를 못 받으면 캡처로 대신한다', async () => {
    serve([item('b')], { catalogFails: true });
    await open();
    expect(
      await screen.findByText('3D 정보를 불러오지 못해 구매자 캡처로 보여 드려요'),
    ).toBeTruthy();
  });

  it('품목을 고르지 않으면 첫 3D 품목을, 3D 품목이 없으면 안내를 보여 준다', async () => {
    serve([item('x', { customMode: 'SLOT' }), item('c')]);
    await open('/orders/7/design');
    expect(await screen.findByText('케이크 c')).toBeTruthy();

    serve([item('x', { customMode: 'SLOT' })]);
    await open('/orders/7/design');
    expect(await screen.findByText('3D 디자인이 있는 상품이 아니에요')).toBeTruthy();
  });

  it('캡처가 없으면 비어 있다고 알린다', async () => {
    serve([item('b', { threeDDesign: null, customImages: [] })]);
    await open();
    expect(await screen.findByText('구매자 캡처가 없어요')).toBeTruthy();
  });

  it('주문을 못 받으면 다시 시도할 수 있다', async () => {
    serve([], { orderFails: true });
    await open();
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeTruthy();
    serve([item('b')]);
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('케이크 b')).toBeTruthy();
  });
});
