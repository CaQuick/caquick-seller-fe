import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import type * as MockReact from 'react';
import type * as MockRN from 'react-native';
import { toast } from 'sonner-native';

import { type SellerProductManageQuery } from '@/graphql/generated/graphql';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { OPTIONS_COPY } from '../model/options-live';
import { ProductOptionsScreen } from './options-manage-screen';

jest.mock('sonner-native', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));
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

type Product = SellerProductManageQuery['sellerProduct'];
type Group = Product['optionGroups'][number];

const item = (id: string, title: string, priceDelta: number, isActive = true) => ({
  id,
  title,
  description: null,
  imageUrl: null,
  priceDelta,
  isActive,
});
const GROUPS: Group[] = [
  {
    id: 'g1',
    name: '케이크 사이즈',
    description: null,
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    optionItems: [item('o1', '0호', 0), item('o2', '1호', 5000)],
  },
  {
    id: 'g2',
    name: '케이크 맛',
    description: '시트와 크림',
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    optionItems: [item('o3', '고구마', 3000, false)],
  },
];

const FAIL = graphqlError({
  message: '잠시 후 다시 시도해 주세요.',
  code: 'TEMPORARY_UNAVAILABLE',
  classification: 'INTERNAL_SERVER_ERROR',
  statusCode: 503,
});

/**
 * 옵션 조회는 서버 상태를 돌려주고, mutation은 변수를 기록한 뒤 mutate로 상태를 바꾼다.
 * fail에 든 operation은 오류로 답하고 상태를 바꾸지 않는다
 */
function serve(fail: string[] = []) {
  let groups = GROUPS;
  const calls: Record<string, unknown[]> = {};
  const updateItem = (id: string, patch: object) => {
    groups = groups.map((g) => ({
      ...g,
      optionItems: g.optionItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  };
  server.use(
    graphql.operation(({ operationName, variables }) => {
      if (operationName === 'SellerProductManage')
        return HttpResponse.json({
          data: { sellerProduct: { id: '7', optionGroups: groups, customTemplate: null } },
        });
      (calls[operationName] ??= []).push(variables);
      if (fail.includes(operationName)) return HttpResponse.json({ data: null, errors: [FAIL] });
      const input = variables.input as Record<string, unknown> | undefined;
      if (operationName === 'SellerProductUpdateOptionItem') {
        const { optionItemId, ...patch } = input!;
        updateItem(optionItemId as string, patch);
      }
      if (operationName === 'SellerProductDeleteOptionGroup')
        groups = groups.filter((g) => g.id !== variables.optionGroupId);
      return HttpResponse.json({ data: {} });
    }),
  );
  return calls;
}

function open() {
  const queryClient = createTestQueryClient();
  return renderRouter(
    { 'products/[id]/options': ProductOptionsScreen },
    {
      initialUrl: '/products/7/options',
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );
}

const sheet = (id: string) => within(screen.getByTestId(id));

describe('ProductOptionsScreen', () => {
  beforeEach(() => {
    jest.mocked(toast.error).mockClear();
  });

  it('즉시 저장 안내와 그룹·아이템을 그리고, 꺼진 옵션은 금액을 잠근다', async () => {
    serve();
    await open();
    expect(await screen.findByText(OPTIONS_COPY.guide)).toBeTruthy();
    expect(screen.getByText('케이크 사이즈')).toBeTruthy();
    expect(screen.getByRole('switch', { name: '0호 판매' })).toBeChecked();
    expect(screen.getByRole('switch', { name: '고구마 판매' })).not.toBeChecked();
    expect(screen.getByLabelText('1호 추가 금액')).toHaveDisplayValue('5,000');
    expect(screen.getByLabelText('고구마 추가 금액')).toBeDisabled();
    expect(screen.queryByRole('button', { name: '0호 위로 이동' })).toBeNull();
    expect(screen.queryByRole('button', { name: '1호 아래로 이동' })).toBeNull();
  });

  it('활성 스위치는 바로 저장하고 다시 받은 값으로 그린다', async () => {
    const calls = serve();
    await open();
    await fireEvent.press(await screen.findByRole('switch', { name: '0호 판매' }));
    expect(screen.getByRole('switch', { name: '0호 판매' })).not.toBeChecked();
    await waitFor(() =>
      expect(calls.SellerProductUpdateOptionItem).toEqual([
        { input: { optionItemId: 'o1', isActive: false } },
      ]),
    );
    await waitFor(() => expect(screen.getByLabelText('0호 추가 금액')).toBeDisabled());
  });

  it('저장이 실패하면 이전 값으로 되돌리고 알린다', async () => {
    serve(['SellerProductUpdateOptionItem']);
    await open();
    const toggle = await screen.findByRole('switch', { name: '0호 판매' });
    // 다시 불러오기도 실패해도(오프라인) 캐시의 서버 값으로 돌아와야 한다
    server.use(
      graphql.query('SellerProductManage', () => HttpResponse.json({ data: null, errors: [FAIL] })),
    );
    await fireEvent.press(toggle);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('잠시 후 다시 시도해 주세요.'));
    await waitFor(() => expect(screen.getByRole('switch', { name: '0호 판매' })).toBeChecked());
  });

  it('추가 금액은 입력을 마칠 때 바뀐 경우만 저장하고, 실패하면 입력도 되돌린다', async () => {
    const calls = serve(['SellerProductUpdateOptionItem']);
    await open();
    const input = await screen.findByLabelText('1호 추가 금액');
    await fireEvent(input, 'endEditing');
    expect(calls.SellerProductUpdateOptionItem).toBeUndefined();
    await fireEvent.changeText(input, '5,500');
    await fireEvent(input, 'endEditing');
    await waitFor(() =>
      expect(calls.SellerProductUpdateOptionItem).toEqual([
        { input: { optionItemId: 'o2', priceDelta: 5500 } },
      ]),
    );
    await waitFor(() => expect(screen.getByLabelText('1호 추가 금액')).toHaveDisplayValue('5,000'));
  });

  it('그룹 삭제는 확인 시트를 거쳐 보낸다', async () => {
    const calls = serve();
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '케이크 사이즈 그룹 삭제' }));
    expect(screen.getByRole('header', { name: "'케이크 사이즈' 그룹을 삭제할까요?" })).toBeTruthy();
    expect(
      screen.getByText(
        '그룹 안의 옵션 2개도 함께 삭제돼요\n이미 받은 주문의 선택 내용은 그대로 남아요',
      ),
    ).toBeTruthy();
    expect(calls.SellerProductDeleteOptionGroup).toBeUndefined();
    await fireEvent.press(screen.getByRole('button', { name: '삭제하기' }));
    await waitFor(() => expect(screen.queryByText('케이크 사이즈')).toBeNull());
    expect(calls.SellerProductDeleteOptionGroup).toEqual([{ optionGroupId: 'g1' }]);
  });

  it('그룹 순서는 그룹 id 전체를, 아이템 순서는 그 그룹의 아이템 id 전체를 보낸다', async () => {
    const calls = serve();
    await open();
    await fireEvent.press(await screen.findByTestId('reverse'));
    await fireEvent.press(screen.getByRole('button', { name: '0호 아래로 이동' }));
    await waitFor(() => expect(calls.SellerProductReorderOptionItems).toHaveLength(1));
    expect(calls.SellerProductReorderOptionGroups).toEqual([
      { input: { productId: '7', optionGroupIds: ['g2', 'g1'] } },
    ]);
    expect(calls.SellerProductReorderOptionItems).toEqual([
      { input: { optionGroupId: 'g1', optionItemIds: ['o2', 'o1'] } },
    ]);
  });

  it('아이템 ×는 확인 없이 지운다', async () => {
    const calls = serve();
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '1호 삭제' }));
    expect(screen.queryByText('1호')).toBeNull();
    await waitFor(() =>
      expect(calls.SellerProductDeleteOptionItem).toEqual([{ optionItemId: 'o2' }]),
    );
  });

  it('그룹·아이템 추가는 맨 뒤 순서로 만든다', async () => {
    const calls = serve();
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '옵션 그룹 추가' }));
    await fireEvent.changeText(sheet('group-sheet').getByLabelText('그룹 이름'), '초 추가');
    await fireEvent.press(sheet('group-sheet').getByRole('button', { name: '추가' }));
    await fireEvent.press(screen.getByRole('button', { name: '케이크 맛에 옵션 추가' }));
    await fireEvent.changeText(sheet('item-sheet').getByLabelText('옵션 이름'), '초코');
    await fireEvent.press(sheet('item-sheet').getByRole('button', { name: '추가' }));
    await waitFor(() => expect(calls.SellerProductCreateOptionItem).toHaveLength(1));
    expect(calls.SellerProductCreateOptionGroup).toEqual([
      {
        input: {
          productId: '7',
          name: '초 추가',
          isRequired: true,
          minSelect: 1,
          maxSelect: 1,
          sortOrder: 2,
        },
      },
    ]);
    expect(calls.SellerProductCreateOptionItem).toEqual([
      { input: { optionGroupId: 'g2', title: '초코', priceDelta: 0, sortOrder: 1 } },
    ]);
  });

  it('필수 해제는 바뀐 필드만 보내고, 값이 그대로인 수정은 보내지 않는다', async () => {
    const calls = serve();
    await open();
    await fireEvent.press(await screen.findByRole('switch', { name: '케이크 맛 필수 선택' }));
    await fireEvent.press(screen.getByRole('button', { name: '1호 수정' }));
    await fireEvent.press(sheet('item-sheet').getByRole('button', { name: '저장' }));
    await waitFor(() => expect(calls.SellerProductUpdateOptionGroup).toHaveLength(1));
    expect(calls.SellerProductUpdateOptionGroup).toEqual([
      { input: { optionGroupId: 'g2', isRequired: false, minSelect: 0 } },
    ]);
    expect(calls.SellerProductUpdateOptionItem).toBeUndefined();
  });
});
