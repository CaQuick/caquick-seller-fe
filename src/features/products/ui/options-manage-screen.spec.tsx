import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import type * as MockReact from 'react';
import type * as MockRN from 'react-native';
import { toast } from 'sonner-native';

import {
  type SellerProductManageQuery,
  type SellerProductUpdateOptionItemMutation,
  type SellerProductUpdateOptionItemMutationVariables,
} from '@/graphql/generated/graphql';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { CUSTOMIZATION_COPY } from '../model/customization';
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
  threeDKey: null as string | null,
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

const CATALOG = {
  revision: 1,
  textColorPresets: [],
  optionChoices: [
    { key: 'size.mini', category: 'SIZE', label: '도시락', defaultPriceDelta: 0, selectable: true },
    { key: 'size.no1', category: 'SIZE', label: '1호', defaultPriceDelta: 5000, selectable: true },
    {
      key: 'shape.heart',
      category: 'SHAPE',
      label: '하트',
      defaultPriceDelta: 1000,
      selectable: true,
    },
  ],
};
const THREE_D_GROUPS: Group[] = [
  {
    ...GROUPS[0]!,
    optionItems: [{ ...item('o1', '0호', 0), threeDKey: 'size.mini' }, item('o2', '1호', 5000)],
  },
  GROUPS[1]!,
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
function serve(fail: string[] = [], { customMode = 'NONE', groups: initial = GROUPS } = {}) {
  let groups = initial;
  const calls: Record<string, unknown[]> = {};
  const updateItem = (id: string, patch: object) => {
    groups = groups.map((g) => ({
      ...g,
      optionItems: g.optionItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  };
  server.use(
    graphql.operation(({ operationName, variables }) => {
      (calls[operationName] ??= []).push(variables);
      if (operationName === 'SellerProductManage')
        return HttpResponse.json({
          data: {
            sellerProduct: { id: '7', customMode, optionGroups: groups, customTemplate: null },
          },
        });
      if (operationName === 'SellerCustomCatalog')
        return HttpResponse.json({ data: { customThreeDCatalog: CATALOG } });
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
const WARN_HINT = '3D 그룹이라 3D 항목을 이어야 해요';

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
    expect(screen.queryByText(OPTIONS_COPY.threeDGuide)).toBeNull();
    expect(screen.queryByRole('button', { name: /3D 항목/ })).toBeNull();
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

  it('같은 옵션을 연달아 바꾸면 앞 저장이 끝난 뒤 다음을 보내 서버에도 마지막 편집이 남는다', async () => {
    let isActive = true;
    const log: string[] = [];
    const releases: (() => void)[] = [];
    server.use(
      graphql.query<SellerProductManageQuery>('SellerProductManage', () => {
        log.push(`조회 ${isActive}`);
        const [size, ...rest] = GROUPS;
        const items = size!.optionItems.map((i) => (i.id === 'o1' ? { ...i, isActive } : i));
        return HttpResponse.json({
          data: {
            sellerProduct: {
              id: '7',
              customMode: 'NONE',
              optionGroups: [{ ...size!, optionItems: items }, ...rest],
              customTemplate: null,
            },
          },
        });
      }),
      graphql.mutation<
        SellerProductUpdateOptionItemMutation,
        SellerProductUpdateOptionItemMutationVariables
      >('SellerProductUpdateOptionItem', async ({ variables: { input } }) => {
        log.push(`보냄 ${input.isActive}`);
        // 첫 요청은 풀어 줄 때 반영된다 — 그사이 뒤 요청이 먼저 반영되면 순서가 뒤집힌다
        if (releases.length === 0) await new Promise<void>((resolve) => releases.push(resolve));
        isActive = input.isActive!;
        log.push(`반영 ${input.isActive}`);
        return HttpResponse.json({ data: { sellerUpdateOptionItem: { id: 'o1' } } });
      }),
    );
    const toggle = () => screen.getByRole('switch', { name: '0호 판매' });
    const edits = () => log.filter((e) => !e.startsWith('조회'));
    await open();
    await fireEvent.press(await screen.findByRole('switch', { name: '0호 판매' }));
    await waitFor(() => expect(edits()).toEqual(['보냄 false']));
    await fireEvent.press(toggle());
    expect(toggle()).toBeChecked();
    expect(edits()).toEqual(['보냄 false']);

    releases[0]!();
    await waitFor(() => expect(edits()).toHaveLength(4));
    expect(edits()).toEqual(['보냄 false', '반영 false', '보냄 true', '반영 true']);
    expect(isActive).toBe(true);
    // 줄이 빈 뒤 다시 받은 서버 값으로도 켜져 있다
    await waitFor(() => expect(log.at(-1)).toBe('조회 true'));
    await waitFor(() => expect(toggle()).toBeChecked());
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

  describe('3D 상품', () => {
    const open3d = async (fail: string[] = []) => {
      const calls = serve(fail, { customMode: 'THREE_D', groups: THREE_D_GROUPS });
      await open();
      await screen.findByText(OPTIONS_COPY.threeDGuide);
      return calls;
    };

    it('그룹 칩·미지정 경고를 그리고, 고를 키는 그룹 카테고리로 묶고 쓰는 키는 막는다', async () => {
      const calls = await open3d();
      expect(await screen.findByText('3D · 크기')).toBeTruthy();
      expect(screen.getByText('3D 항목 미지정 1개')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: '고구마 3D 항목 미지정' }).props.accessibilityHint,
      ).toBeUndefined();
      const unlinked = screen.getByRole('button', { name: '1호 3D 항목 미지정' });
      expect(unlinked.props.accessibilityHint).toBe(WARN_HINT);

      await fireEvent.press(unlinked);
      const keys = sheet('three-d-key-sheet');
      expect(keys.getByText('이 그룹은 크기 항목만 이을 수 있어요')).toBeTruthy();
      expect(keys.getByRole('button', { name: '도시락' })).toBeDisabled();
      expect(keys.queryByRole('button', { name: '하트' })).toBeNull();
      await fireEvent.press(keys.getByRole('button', { name: '1호' }));
      await waitFor(() =>
        expect(calls.SellerProductUpdateOptionItem).toEqual([
          { input: { optionItemId: 'o2', threeDKey: 'size.no1' } },
        ]),
      );
      await waitFor(() => expect(screen.queryByText('3D 항목 미지정 1개')).toBeNull());
    });

    it('꺼진 선택지만 키가 있는 그룹은 3D와 무관하게 보고 카테고리도 고정하지 않는다', async () => {
      serve([], {
        customMode: 'THREE_D',
        groups: [
          {
            ...GROUPS[0]!,
            optionItems: [
              { ...item('o1', '0호', 0, false), threeDKey: 'size.mini' },
              item('o2', '1호', 5000),
            ],
          },
        ],
      });
      await open();
      const chip = await screen.findByRole('button', { name: '1호 3D 항목 미지정' });
      expect(chip.props.accessibilityHint).toBeUndefined();
      expect(screen.queryByText('3D 항목 미지정 1개')).toBeNull();
      expect(screen.queryByText('3D · 크기')).toBeNull();

      await fireEvent.press(chip);
      const keys = sheet('three-d-key-sheet');
      expect(keys.queryByText('이 그룹은 크기 항목만 이을 수 있어요')).toBeNull();
      expect(keys.getByRole('button', { name: '하트' })).toBeEnabled();
      // 다시 켤 때 겹치지 않게 꺼진 선택지의 키는 막는다
      expect(keys.getByRole('button', { name: '도시락' })).toBeDisabled();
    });

    it('3D 항목 목록을 못 받으면 편집기 대신 다시 시도를 보이고, 받으면 3D 칸을 그린다', async () => {
      serve([], { customMode: 'THREE_D', groups: THREE_D_GROUPS });
      server.use(
        graphql.query('SellerCustomCatalog', () => HttpResponse.json({ errors: [FAIL] }), {
          once: true,
        }),
      );
      await open();
      expect(await screen.findByText(OPTIONS_COPY.catalogError)).toBeTruthy();
      expect(screen.getByText(OPTIONS_COPY.threeDGuide)).toBeTruthy();
      expect(screen.queryByRole('button', { name: '케이크 맛에 옵션 추가' })).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
      expect(await screen.findByText('3D · 크기')).toBeTruthy();
      expect(screen.getByRole('button', { name: '케이크 맛에 옵션 추가' })).toBeTruthy();
    });

    it('카탈로그에 없는 키로 이어진 항목도 연결을 끊을 수 있다', async () => {
      const groups: Group[] = [
        {
          ...GROUPS[0]!,
          optionItems: [
            { ...item('o1', '0호', 0), threeDKey: 'size.ghost' },
            item('o2', '1호', 5000),
          ],
        },
        GROUPS[1]!,
      ];
      const calls = serve([], { customMode: 'THREE_D', groups });
      await open();
      await fireEvent.press(await screen.findByRole('button', { name: '0호 3D 항목 size.ghost' }));
      await fireEvent.press(
        sheet('three-d-key-sheet').getByRole('button', { name: '3D 연결 끊기' }),
      );
      await waitFor(() =>
        expect(calls.SellerProductUpdateOptionItem).toEqual([
          { input: { optionItemId: 'o1', threeDKey: null } },
        ]),
      );
    });

    it('연결을 끊으면 키를 null로 보낸다', async () => {
      const calls = await open3d();
      await fireEvent.press(await screen.findByRole('button', { name: '0호 3D 항목 도시락' }));
      await fireEvent.press(
        sheet('three-d-key-sheet').getByRole('button', { name: '3D 연결 끊기' }),
      );
      await waitFor(() =>
        expect(calls.SellerProductUpdateOptionItem).toEqual([
          { input: { optionItemId: 'o1', threeDKey: null } },
        ]),
      );
    });

    it('새 옵션은 3D 항목부터 골라 이름·기본 가격을 채우고, 직접 입력도 고를 수 있다', async () => {
      const calls = await open3d();
      await fireEvent.press(screen.getByRole('button', { name: '케이크 맛에 옵션 추가' }));
      await fireEvent.press(
        sheet('three-d-key-sheet').getByRole('button', { name: '1호 +5,000원' }),
      );
      await waitFor(() =>
        expect(calls.SellerProductCreateOptionItem).toEqual([
          {
            input: {
              optionGroupId: 'g2',
              title: '1호',
              priceDelta: 5000,
              threeDKey: 'size.no1',
              sortOrder: 1,
            },
          },
        ]),
      );

      await fireEvent.press(screen.getByRole('button', { name: '케이크 맛에 옵션 추가' }));
      await fireEvent.press(
        sheet('three-d-key-sheet').getByRole('button', { name: '3D 항목 없이 직접 입력' }),
      );
      await fireEvent.changeText(sheet('item-sheet').getByLabelText('옵션 이름'), '초코');
      await fireEvent.press(sheet('item-sheet').getByRole('button', { name: '추가' }));
      await waitFor(() => expect(calls.SellerProductCreateOptionItem).toHaveLength(2));
      expect(calls.SellerProductCreateOptionItem![1]).toEqual({
        input: { optionGroupId: 'g2', title: '초코', priceDelta: 0, sortOrder: 1 },
      });
    });

    it('3D 기본 세트를 불러오고 다시 받는다', async () => {
      const calls = await open3d();
      const fetched = calls.SellerProductManage!.length;
      await fireEvent.press(screen.getByRole('button', { name: CUSTOMIZATION_COPY.preset }));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(CUSTOMIZATION_COPY.presetDone),
      );
      expect(calls.SellerProductApplyThreeDPreset).toEqual([{ productId: '7' }]);
      await waitFor(() => expect(calls.SellerProductManage!.length).toBeGreaterThan(fetched));
    });
  });
});
