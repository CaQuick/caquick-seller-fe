import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import type * as MockReact from 'react';
import type * as MockRN from 'react-native';
import { Text } from 'react-native';
import { toast } from 'sonner-native';

import { authKeys, useSessionStore } from '@/features/auth';
import { mockFileSizes } from '@/test/mocks';
import { gqlError, gqlOk, graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { EMPTY_DRAFT, type ProductDraft, saveDraft, useDraftStore } from '../model/draft-store';
import { ProductNewBasicScreen } from './create-basic-screen';
import { ProductNewLayout } from './create-frame';
import { ProductNewOptionsScreen } from './create-options-screen';
import { ProductNewPreviewScreen } from './create-preview-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));
jest.mock('sonner-native', () => ({
  Toaster: () => null,
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
// expo-router testing-library가 reanimated를 mock으로 바꿔 sortables가 돌지 않는다 — 정렬은 버튼으로 흉내 낸다
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
        testID: 'reverse-groups',
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

const ACCOUNT = '7';
const DRAFT_KEY = `caquick.productDraft.${ACCOUNT}`;
const me = (accountId: string) => ({
  accountId,
  username: 'seller',
  displayName: null,
  storeId: '3',
  mustChangePassword: false,
  accountStatus: 'ACTIVE',
});
const sellerMe = (accountId: string) => gqlOk('SellerAuthMe', { sellerMe: me(accountId) });

/**
 * 앱처럼 부팅이 채운 내 계정을 깔고 연다(null이면 화면이 직접 조회).
 * renderRouter는 결과 Promise에 헬퍼(getPathname)를 얹는다 — async로 감싸지 않고 그대로 돌려준다
 */
function openCreate(initialUrl = '/products/new/basic', accountId: string | null = ACCOUNT) {
  const queryClient = createTestQueryClient();
  if (accountId !== null) {
    queryClient.setQueryDefaults(authKeys.me(), { gcTime: Infinity });
    queryClient.setQueryData(authKeys.me(), me(accountId));
  }
  return renderRouter(
    {
      _layout: () => <Stack />,
      products: () => <Text>상품 목록</Text>,
      'products/[id]/index': () => <Text>상품 상세</Text>,
      'products/new/_layout': ProductNewLayout,
      'products/new/basic': ProductNewBasicScreen,
      'products/new/options': ProductNewOptionsScreen,
      'products/new/preview': ProductNewPreviewScreen,
    },
    {
      initialUrl,
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );
}

/** 변수를 기록하고 data를 돌려준다. fail(n)이 참인 n번째 호출은 오류로 답한다 */
function record(
  operation: string,
  data: (vars: Record<string, unknown>, n: number) => object,
  fail?: (n: number) => boolean,
) {
  const calls: Record<string, unknown>[] = [];
  server.use(
    graphql.operation(({ operationName, variables }) => {
      if (operationName !== operation) return undefined;
      calls.push(variables);
      if (fail?.(calls.length)) {
        return HttpResponse.json({
          data: null,
          errors: [
            graphqlError({
              message: '잠시 후 다시 시도해 주세요.',
              code: 'TEMPORARY_UNAVAILABLE',
              classification: 'INTERNAL_SERVER_ERROR',
              statusCode: 503,
            }),
          ],
        });
      }
      return HttpResponse.json({ data: data(variables, calls.length) });
    }),
  );
  return calls;
}

const CATEGORIES = [
  { id: '1', name: '생일', categoryType: 'EVENT', sortOrder: 2 },
  { id: '2', name: '크리스마스', categoryType: 'EVENT', sortOrder: 1 },
  { id: '3', name: '입체', categoryType: 'STYLE', sortOrder: 1 },
  { id: '4', name: '기타', categoryType: 'OTHER', sortOrder: 1 },
];

const picked = (...uris: string[]) =>
  jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({
    canceled: false,
    assets: uris.map((uri) => ({ uri, width: 1000, height: 1000 })),
  } as never);

const presign = (fail?: (n: number) => boolean) =>
  record(
    'SellerUploadsCreateUploadUrl',
    (_, n) => ({
      sellerCreateUploadUrl: {
        uploadUrl: `https://s3/put/${n}`,
        publicUrl: `https://cdn/${n}.jpg`,
      },
    }),
    fail,
  );

const done = (n: number) => ({
  key: `img${n}`,
  uri: `https://cdn/${n}.jpg`,
  source: null,
  publicUrl: `https://cdn/${n}.jpg`,
  status: 'done' as const,
});

const FILLED: ProductDraft = {
  ...EMPTY_DRAFT,
  images: [done(1), done(2)],
  name: '그림일기 케이크',
  regularPrice: '35000',
  salePrice: '33000',
  description: '원하는 그림을 올려 드려요',
  purchaseNotice: '픽업 후 흔들릴 수 있어요',
  eventCategoryId: '2',
  styleCategoryId: null,
  tags: ['눈'],
  optionGroups: [
    {
      key: 'g1',
      name: '케이크 사이즈',
      description: '',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      items: [
        { key: 'i1', title: '0호 케이크 10cm', description: '', priceDelta: 0, imageUrl: null },
        { key: 'i2', title: '1호 케이크 15cm', description: '', priceDelta: 5000, imageUrl: null },
      ],
    },
  ],
};

const presentSpy = jest.spyOn(BottomSheetModal.prototype, 'present');
const sheet = (id: string) => within(screen.getByTestId(id));
const nextButton = () => screen.getByRole('button', { name: '다음' });

beforeEach(async () => {
  useSessionStore.setState({
    status: 'authenticated',
    accessToken: 'at',
    mustChangePassword: false,
  });
  useDraftStore.getState().reset();
  await AsyncStorage.clear();
  mockFileSizes.set('file:///cache/p.jpg', 2048);
  server.use(
    gqlOk('SellerProductsFilterCategories', { categories: CATEGORIES }),
    sellerMe(ACCOUNT),
  );
});
afterEach(() => jest.clearAllMocks());

describe('1/3 기본 정보', () => {
  it('필수값 전에는 연한 다음이고, 누르면 빠진 항목을 알려 주며 넘어가지 않는다', async () => {
    const router = openCreate();
    await router;
    expect(await screen.findByLabelText('1/3 기본 정보')).toBeTruthy();
    await fireEvent.press(nextButton());
    expect(await screen.findByText('이미지를 1장 이상 올려 주세요')).toBeTruthy();
    expect(screen.getByText('상품명을 입력해 주세요')).toBeTruthy();
    expect(screen.getByText('정가를 입력해 주세요')).toBeTruthy();
    expect(router.getPathname()).toBe('/products/new/basic');
  });

  it('가격은 천단위로 보이고 할인가가 정가 이상이면 바로 알린다', async () => {
    await openCreate();
    await fireEvent.changeText(await screen.findByLabelText('정가'), '35,000원');
    await fireEvent.changeText(screen.getByLabelText('할인가'), '35000');
    expect(screen.getByLabelText('정가')).toHaveDisplayValue('35,000');
    expect(screen.getByText('할인가는 정가보다 낮아야 해요')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('할인가'), '33000');
    expect(screen.queryByText('할인가는 정가보다 낮아야 해요')).toBeNull();
  });

  it('이미지를 여러 장 고르면 바로 올리고, 실패한 장은 눌러 다시 올린다', async () => {
    const calls = presign((n) => n === 2);
    picked('file:///a.jpg', 'file:///b.jpg');
    await openCreate();
    await fireEvent.press(await screen.findByRole('button', { name: '이미지 추가 (0/6)' }));
    expect(await screen.findByRole('button', { name: '상품 이미지 2 다시 올리기' })).toBeTruthy();
    expect(toast.error).toHaveBeenCalledWith('잠시 후 다시 시도해 주세요.');
    expect(calls.map((c) => (c.input as { purpose: string }).purpose)).toEqual([
      'PRODUCT_IMAGE',
      'PRODUCT_IMAGE',
    ]);

    await fireEvent.press(screen.getByRole('button', { name: '상품 이미지 2 다시 올리기' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '상품 이미지 2 다시 올리기' })).toBeNull(),
    );
    expect(useDraftStore.getState().draft.images.map((i) => i.publicUrl)).toEqual([
      'https://cdn/1.jpg',
      'https://cdn/3.jpg',
    ]);
    await fireEvent.press(screen.getByRole('button', { name: '상품 이미지 1 삭제' }));
    expect(screen.getByRole('button', { name: '이미지 추가 (1/6)' })).toBeTruthy();
  });

  it('필수값을 채우면 2/3으로 넘어간다', async () => {
    presign();
    picked('file:///a.jpg');
    const router = openCreate();
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '이미지 추가 (0/6)' }));
    await fireEvent.changeText(screen.getByLabelText('상품명'), '그림일기 케이크');
    await fireEvent.changeText(screen.getByLabelText('정가'), '35000');
    await waitFor(() => expect(useDraftStore.getState().draft.images[0]?.status).toBe('done'));
    await fireEvent.press(nextButton());
    expect(await screen.findByLabelText('2/3 옵션 정보')).toBeTruthy();
    expect(router.getPathname()).toBe('/products/new/options');
  });

  it('카테고리 시트는 탭마다 1개를 고르고 다시 누르면 해제하며, 닫기로 버린 선택은 남지 않는다', async () => {
    await openCreate();
    await fireEvent.press(await screen.findByRole('button', { name: '이벤트별 카테고리' }));
    // 이벤트 탭은 sortOrder 순, OTHER는 고를 수 없다
    const chips = await sheet('category-sheet').findAllByRole('button', { selected: false });
    expect(chips.map((c) => c.props.accessibilityLabel as string).slice(0, 2)).toEqual([
      '크리스마스',
      '생일',
    ]);
    expect(sheet('category-sheet').queryByRole('button', { name: '기타' })).toBeNull();
    await fireEvent.press(sheet('category-sheet').getByRole('button', { name: '생일' }));
    await fireEvent.press(sheet('category-sheet').getByRole('button', { name: '크리스마스' }));
    await fireEvent.press(sheet('category-sheet').getByRole('tab', { name: '스타일별' }));
    await fireEvent.press(sheet('category-sheet').getByRole('button', { name: '입체' }));
    await fireEvent.press(sheet('category-sheet').getByRole('button', { name: '입체' }));
    await fireEvent.press(sheet('category-sheet').getByRole('button', { name: '입체' }));
    await fireEvent.press(sheet('category-sheet').getByRole('button', { name: '등록하기' }));
    expect(screen.getByRole('button', { name: '이벤트별 카테고리' })).toHaveAccessibilityValue({
      text: '크리스마스',
    });
    expect(screen.getByRole('button', { name: '스타일별 카테고리' })).toHaveAccessibilityValue({
      text: '입체',
    });

    await fireEvent.press(screen.getByRole('button', { name: '스타일별 카테고리' }));
    expect(
      sheet('category-sheet').getByRole('tab', { name: '스타일별', selected: true }),
    ).toBeTruthy();
    await fireEvent.press(sheet('category-sheet').getByRole('button', { name: '입체' }));
    await fireEvent.press(sheet('category-sheet').getByRole('button', { name: '닫기' }));
    expect(useDraftStore.getState().draft).toMatchObject({
      eventCategoryId: '2',
      styleCategoryId: '3',
    });
  });

  it('태그는 스페이스로 확정하고, 제안을 고르거나 새로 만든 뒤 확인하면 폼에 붙는다', async () => {
    const searches = record('SellerProductTagSearch', (vars) => ({
      sellerSearchTags:
        (vars.input as { keyword: string }).keyword === '트'
          ? [{ id: 't1', name: '트리', isExactMatch: false, productCount: 1200 }]
          : [],
    }));
    await openCreate();
    await fireEvent.press(await screen.findByRole('button', { name: '키워드 등록' }));
    const input = sheet('tag-sheet').getByLabelText('태그 입력');
    await fireEvent.changeText(input, '#Snow ');
    expect(sheet('tag-sheet').getByText('#snow')).toBeTruthy();
    expect(input).toHaveDisplayValue('');

    await fireEvent.changeText(input, '#트');
    const suggestion = await sheet('tag-sheet').findByRole('button', { name: '#트리 추가' });
    expect(sheet('tag-sheet').getByText('상품 1,200개')).toBeTruthy();
    expect(sheet('tag-sheet').getByRole('button', { name: '#트 새 태그 만들기' })).toBeTruthy();
    expect(searches.at(-1)).toEqual({ input: { keyword: '트', limit: 8 } });
    await fireEvent.press(suggestion);

    await fireEvent.changeText(input, '첫눈');
    await fireEvent.press(
      await sheet('tag-sheet').findByRole('button', { name: '#첫눈 새 태그 만들기' }),
    );
    await fireEvent.press(sheet('tag-sheet').getByRole('button', { name: '#snow 삭제' }));
    await fireEvent.press(sheet('tag-sheet').getByRole('button', { name: '확인' }));
    expect(screen.getByText('# 트리')).toBeTruthy();
    expect(screen.getByText('# 첫눈')).toBeTruthy();
    expect(useDraftStore.getState().draft.tags).toEqual(['트리', '첫눈']);
  });

  it('태그는 20개까지만 붙이고 넘치면 입력을 남긴 채 알린다', async () => {
    record('SellerProductTagSearch', () => ({ sellerSearchTags: [] }));
    const full = Array.from({ length: 20 }, (_, i) => `t${i}`);
    useDraftStore.getState().patch({ tags: full });
    await openCreate();
    await fireEvent.press(await screen.findByRole('button', { name: '키워드 편집' }));
    const input = sheet('tag-sheet').getByLabelText('태그 입력');
    await fireEvent.changeText(input, '하나 더 ');
    expect(sheet('tag-sheet').getByText('키워드는 최대 20개까지 등록할 수 있어요')).toBeTruthy();
    expect(input).toHaveDisplayValue('하나 더');
    await fireEvent.press(sheet('tag-sheet').getByRole('button', { name: '확인' }));
    expect(useDraftStore.getState().draft.tags).toEqual(full);
  });

  it('임시저장하면 다음 진입 때 복원 여부를 묻고, 불러오면 이어서 작성한다', async () => {
    await openCreate();
    await fireEvent.changeText(await screen.findByLabelText('상품명'), '그림일기 케이크');
    await fireEvent.press(screen.getByRole('button', { name: '임시저장' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('임시저장했어요'));
    await screen.unmount();
    expect(useDraftStore.getState().draft.name).toBe('');

    await openCreate();
    expect(
      await screen.findByText("'그림일기 케이크'를 이어서 작성할까요?", { exact: false }),
    ).toBeTruthy();
    expect(presentSpy).toHaveBeenCalled();
    expect(screen.getByLabelText('상품명')).toHaveDisplayValue('');
    await fireEvent.press(screen.getByRole('button', { name: '불러오기' }));
    expect(screen.getByLabelText('상품명')).toHaveDisplayValue('그림일기 케이크');
  });

  it('다른 계정으로 들어오면 이전 계정의 임시저장을 묻지 않는다', async () => {
    await saveDraft(ACCOUNT, FILLED);
    const read = jest.spyOn(AsyncStorage, 'getItem');
    server.use(sellerMe('8'));
    await openCreate(undefined, '8');
    await waitFor(() => expect(read).toHaveBeenCalledWith('caquick.productDraft.8'));
    await waitFor(() => expect(screen.getByLabelText('상품명')).toBeTruthy());
    expect(screen.queryByText(/이어서 작성할까요/)).toBeNull();
    expect(presentSpy).not.toHaveBeenCalled();
  });

  it('내 계정을 받지 못했으면 임시저장하지 않고 알린다', async () => {
    server.use(gqlError('SellerAuthMe', { message: 'x', classification: 'INTERNAL_SERVER_ERROR' }));
    const write = jest.spyOn(AsyncStorage, 'setItem');
    await openCreate(undefined, null);
    await fireEvent.press(await screen.findByRole('button', { name: '임시저장' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('임시저장하지 못했어요. 잠시 후 다시 시도해 주세요'),
    );
    expect(write).not.toHaveBeenCalled();
  });

  it('임시저장이 실패하면 알린다', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
    await openCreate();
    await fireEvent.press(await screen.findByRole('button', { name: '임시저장' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('임시저장하지 못했어요. 잠시 후 다시 시도해 주세요'),
    );
  });

  it('작성 중에 뒤로 가면 확인을 받고 나간다', async () => {
    const router = openCreate();
    await router;
    await fireEvent.changeText(await screen.findByLabelText('상품명'), '케이크');
    presentSpy.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(router.getPathname()).toBe('/products/new/basic');
    await fireEvent.press(screen.getByRole('button', { name: '나가기' }));
    expect(await screen.findByText('상품 목록')).toBeTruthy();
    // Stack이 내려가면 초안을 비운다
    expect(useDraftStore.getState().draft.name).toBe('');
  });

  it('빈 폼은 확인 없이 바로 나간다', async () => {
    await openCreate();
    await fireEvent.press(await screen.findByRole('button', { name: '뒤로 가기' }));
    expect(await screen.findByText('상품 목록')).toBeTruthy();
    expect(presentSpy).not.toHaveBeenCalled();
  });
});

describe('2/3 옵션', () => {
  const card = (key: string) => within(screen.getByTestId(`option-group-${key}`));

  it('옵션 없이도 미리보기로 넘어간다', async () => {
    const router = openCreate('/products/new/options');
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '다음' }));
    expect(await screen.findByLabelText('3/3 등록 미리보기')).toBeTruthy();
    expect(router.getPathname()).toBe('/products/new/preview');
  });

  it('그룹과 옵션을 시트로 추가하고, 빈 그룹이 있으면 넘어가지 않는다', async () => {
    const router = openCreate('/products/new/options');
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '옵션 그룹 추가' }));
    expect(sheet('group-sheet').getByRole('button', { name: '추가' })).toBeDisabled();
    await fireEvent.changeText(sheet('group-sheet').getByLabelText('그룹 이름'), ' 케이크 사이즈 ');
    await fireEvent.changeText(
      sheet('group-sheet').getByLabelText('안내 문구 (선택)'),
      '사이즈를 골라요',
    );
    await fireEvent.press(sheet('group-sheet').getByRole('button', { name: '추가' }));
    expect(await screen.findByText('케이크 사이즈')).toBeTruthy();
    expect(screen.getByText('최소 1 · 최대 1')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText("'케이크 사이즈' 그룹에 옵션을 1개 이상 추가해 주세요")).toBeTruthy();
    expect(router.getPathname()).toBe('/products/new/options');

    await fireEvent.press(screen.getByRole('button', { name: '케이크 사이즈에 옵션 추가' }));
    await fireEvent.changeText(sheet('item-sheet').getByLabelText('옵션 이름'), '1호 케이크 15cm');
    await fireEvent.changeText(sheet('item-sheet').getByLabelText('추가 금액'), '5000');
    expect(sheet('item-sheet').getByLabelText('추가 금액')).toHaveDisplayValue('5,000');
    await fireEvent.press(sheet('item-sheet').getByRole('button', { name: '추가' }));
    expect(screen.queryByText("'케이크 사이즈' 그룹에 옵션을 1개 이상 추가해 주세요")).toBeNull();
    expect(screen.getByText('+5,000원')).toBeTruthy();
    expect(useDraftStore.getState().draft.optionGroups).toMatchObject([
      {
        name: '케이크 사이즈',
        description: '사이즈를 골라요',
        items: [{ title: '1호 케이크 15cm', priceDelta: 5000, imageUrl: null }],
      },
    ]);
    await fireEvent.press(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(router.getPathname()).toBe('/products/new/preview'));
  });

  it('필수를 끄면 최소 0, 선택 개수는 시트의 스테퍼로 고친다', async () => {
    useDraftStore.getState().restore(FILLED);
    await openCreate('/products/new/options');
    await fireEvent.press(await screen.findByRole('switch', { name: '케이크 사이즈 필수 선택' }));
    expect(screen.getByRole('switch', { name: '케이크 사이즈 필수 선택' })).not.toBeChecked();
    expect(card('g1').getByText('최소 0 · 최대 1')).toBeTruthy();

    await fireEvent.press(card('g1').getByRole('button', { name: /선택 개수/ }));
    const range = sheet('range-sheet');
    expect(range.getByRole('button', { name: '최소 선택 줄이기' })).toBeDisabled();
    await fireEvent.press(range.getByRole('button', { name: '최대 선택 늘리기' }));
    // 최대는 옵션 수(2)까지
    expect(range.getByRole('button', { name: '최대 선택 늘리기' })).toBeDisabled();
    await fireEvent.press(range.getByRole('button', { name: '최소 선택 늘리기' }));
    await fireEvent.press(range.getByRole('button', { name: '저장' }));
    expect(card('g1').getByText('최소 1 · 최대 2')).toBeTruthy();
  });

  it('그룹 이름·옵션을 고치고, 옵션 삭제·그룹 순서 변경을 초안에 반영한다', async () => {
    useDraftStore.getState().restore({
      ...FILLED,
      optionGroups: [
        ...FILLED.optionGroups,
        { ...FILLED.optionGroups[0]!, key: 'g2', name: '케이크 맛', items: [] },
      ],
    });
    await openCreate('/products/new/options');
    await fireEvent.press(
      await screen.findByRole('button', { name: '케이크 사이즈 그룹 이름 수정' }),
    );
    expect(sheet('group-sheet').getByLabelText('그룹 이름')).toHaveDisplayValue('케이크 사이즈');
    await fireEvent.changeText(sheet('group-sheet').getByLabelText('그룹 이름'), '사이즈');
    await fireEvent.press(sheet('group-sheet').getByRole('button', { name: '저장' }));

    await fireEvent.press(screen.getByRole('button', { name: '1호 케이크 15cm 수정' }));
    expect(sheet('item-sheet').getByLabelText('추가 금액')).toHaveDisplayValue('5,000');
    await fireEvent.changeText(sheet('item-sheet').getByLabelText('설명 (선택)'), '15cm');
    await fireEvent.press(sheet('item-sheet').getByRole('button', { name: '저장' }));
    expect(screen.getByText('15cm')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '0호 케이크 10cm 삭제' }));
    await fireEvent.press(screen.getByTestId('reverse-groups'));
    const groups = useDraftStore.getState().draft.optionGroups;
    expect(groups.map((g) => g.name)).toEqual(['케이크 맛', '사이즈']);
    expect(groups[1]!.items).toMatchObject([{ title: '1호 케이크 15cm', description: '15cm' }]);
  });

  it('옵션이 있는 그룹은 확인 뒤 지우고, 빈 그룹은 바로 지운다', async () => {
    useDraftStore.getState().restore({
      ...FILLED,
      optionGroups: [
        ...FILLED.optionGroups,
        { ...FILLED.optionGroups[0]!, key: 'g2', name: '케이크 맛', items: [] },
      ],
    });
    await openCreate('/products/new/options');
    presentSpy.mockClear();
    await fireEvent.press(await screen.findByRole('button', { name: '케이크 맛 그룹 삭제' }));
    expect(presentSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('케이크 맛')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: '케이크 사이즈 그룹 삭제' }));
    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('그룹 안의 옵션 2개도 함께 삭제돼요')).toBeTruthy();
    expect(useDraftStore.getState().draft.optionGroups).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: '삭제하기' }));
    expect(useDraftStore.getState().draft.optionGroups).toEqual([]);
  });

  it('2/3에서 임시저장하면 옵션까지 저장한다', async () => {
    useDraftStore.getState().restore(FILLED);
    await openCreate('/products/new/options');
    await fireEvent.press(await screen.findByRole('button', { name: '임시저장' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('임시저장했어요'));
    const raw = JSON.parse((await AsyncStorage.getItem(DRAFT_KEY))!) as {
      draft: ProductDraft;
    };
    expect(raw.draft.optionGroups).toEqual(FILLED.optionGroups);
  });

  it('옵션 썸네일은 눌러서 올리고, 실패하면 알린다', async () => {
    useDraftStore.getState().restore(FILLED);
    presign((n) => n === 1);
    picked('file:///o.jpg');
    await openCreate('/products/new/options');
    await fireEvent.press(
      await screen.findByRole('button', { name: '0호 케이크 10cm 이미지 추가' }),
    );
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('잠시 후 다시 시도해 주세요.'));

    picked('file:///o.jpg');
    await fireEvent.press(screen.getByRole('button', { name: '0호 케이크 10cm 이미지 추가' }));
    expect(await screen.findByRole('button', { name: '0호 케이크 10cm 이미지 변경' })).toBeTruthy();
    expect(useDraftStore.getState().draft.optionGroups[0]!.items[0]!.imageUrl).toBe(
      'https://cdn/2.jpg',
    );
  });
});

describe('3/3 미리보기·등록', () => {
  /** 체인 핸들러 전부. failOn[op](n)이 참이면 그 호출을 실패시킨다 */
  function chain(failOn: Record<string, (n: number) => boolean> = {}) {
    const ok = (op: string, data: (vars: Record<string, unknown>, n: number) => object) =>
      record(op, data, failOn[op]);
    return {
      create: ok('SellerProductCreate', () => ({ sellerCreateProduct: { id: '100' } })),
      image: ok('SellerProductAddImage', (_, n) => ({ sellerAddProductImage: { id: `pi${n}` } })),
      categories: ok('SellerProductSetCategories', () => ({
        sellerSetProductCategories: { id: '100' },
      })),
      tags: ok('SellerProductSetTags', () => ({ sellerSetProductTagsByName: { id: '100' } })),
      group: ok('SellerProductCreateOptionGroup', (_, n) => ({
        sellerCreateOptionGroup: { id: `g${n}` },
      })),
      item: ok('SellerProductCreateOptionItem', (_, n) => ({
        sellerCreateOptionItem: { id: `i${n}` },
      })),
      active: ok('SellerProductSetActive', () => ({
        sellerSetProductActive: { id: '100', isActive: true },
      })),
      remove: ok('SellerProductDelete', () => ({ sellerDeleteProduct: true })),
    };
  }
  const submitSheet = () => sheet('submit-sheet');

  beforeEach(() => useDraftStore.getState().restore(FILLED));

  it('구매자 상세 모양으로 보여준다: 할인율(반올림)·정가 취소선·안내 박스·옵션 금액', async () => {
    await openCreate('/products/new/preview');
    expect(await screen.findByText('6%')).toBeTruthy();
    expect(screen.getByText('35,000')).toBeTruthy();
    expect(screen.getByText('33,000원')).toBeTruthy();
    expect(screen.getByText('구매 전 필독사항')).toBeTruthy();
    expect(screen.getByText('픽업 후 흔들릴 수 있어요')).toBeTruthy();
    expect(screen.getByText('상품 설명')).toBeTruthy();
    expect(screen.getByText('케이크 사이즈')).toBeTruthy();
    expect(screen.getByText(' +5,000원')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '후기(0)' })).toBeDisabled();
    expect(screen.getAllByLabelText(/상품 이미지 \d\/2/)).toHaveLength(2);
  });

  it('할인가가 없으면 할인율·취소선 없이 정가만 보인다', async () => {
    useDraftStore.getState().patch({ salePrice: '', description: '' });
    await openCreate('/products/new/preview');
    expect(await screen.findByText('35,000원')).toBeTruthy();
    expect(screen.queryByText('35,000')).toBeNull();
    expect(screen.queryByText('6%')).toBeNull();
    expect(screen.queryByText('상품 설명')).toBeNull();
  });

  it('등록하기는 숨김 생성부터 노출까지 부른 뒤 상품 상세로 가고 토스트를 띄우며 초안을 지운다', async () => {
    const calls = chain();
    await saveDraft(ACCOUNT, FILLED);
    const router = openCreate('/products/new/preview');
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '등록하기' }));
    expect(await screen.findByText('상품 상세')).toBeTruthy();
    expect(router.getPathname()).toBe('/products/100');
    expect(toast.success).toHaveBeenCalledWith('상품이 등록되었습니다');
    expect(calls.create).toEqual([
      {
        input: {
          name: '그림일기 케이크',
          initialImageUrl: 'https://cdn/1.jpg',
          description: '원하는 그림을 올려 드려요',
          purchaseNotice: '픽업 후 흔들릴 수 있어요',
          regularPrice: 35000,
          salePrice: 33000,
          isActive: false,
        },
      },
    ]);
    expect(calls.image).toEqual([{ input: { productId: '100', imageUrl: 'https://cdn/2.jpg' } }]);
    expect(calls.categories).toEqual([{ input: { productId: '100', categoryIds: ['2'] } }]);
    expect(calls.tags).toEqual([{ input: { productId: '100', names: ['눈'] } }]);
    expect(calls.group).toHaveLength(1);
    expect(calls.item.map((c) => (c.input as { optionGroupId: string }).optionGroupId)).toEqual([
      'g1',
      'g1',
    ]);
    expect(calls.active).toEqual([{ input: { productId: '100', isActive: true } }]);
    expect(calls.remove).toEqual([]);
    expect(await AsyncStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('중간에 실패하면 단계와 문구를 보이고, 다시 시도는 만든 상품을 이어서 등록한다', async () => {
    const calls = chain({ SellerProductSetTags: (n) => n === 1 });
    await openCreate('/products/new/preview');
    await fireEvent.press(await screen.findByRole('button', { name: '등록하기' }));
    expect(await submitSheet().findByText('등록을 마치지 못했어요')).toBeTruthy();
    expect(submitSheet().getByLabelText('키워드 연결 실패')).toBeTruthy();
    expect(submitSheet().getByLabelText('카테고리 연결 완료')).toBeTruthy();
    expect(submitSheet().getByText('잠시 후 다시 시도해 주세요.')).toBeTruthy();
    expect(useDraftStore.getState().progress).toMatchObject({ productId: '100', addedImages: 1 });
    expect(screen.getByRole('button', { name: '이어서 등록' })).toBeTruthy();

    await fireEvent.press(submitSheet().getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('상품 상세')).toBeTruthy();
    // 반증: 진행을 보존하지 않으면 상품·이미지가 두 번 만들어진다
    expect(calls.create).toHaveLength(1);
    expect(calls.image).toHaveLength(1);
    expect(calls.categories).toHaveLength(1);
    expect(calls.tags).toHaveLength(2);
    expect(calls.active).toHaveLength(1);
  });

  it('포기하면 만든 상품을 지우고 미리보기로 돌아온다', async () => {
    const calls = chain({ SellerProductCreateOptionItem: (n) => n === 2 });
    await openCreate('/products/new/preview');
    await fireEvent.press(await screen.findByRole('button', { name: '등록하기' }));
    await fireEvent.press(await submitSheet().findByRole('button', { name: '포기하기' }));
    await waitFor(() => expect(calls.remove).toEqual([{ productId: '100' }]));
    expect(toast).toHaveBeenCalledWith('등록을 취소했어요');
    expect(useDraftStore.getState().progress.productId).toBeNull();
    expect(screen.getByRole('button', { name: '등록하기' })).toBeTruthy();
    expect(useDraftStore.getState().draft.name).toBe('그림일기 케이크');
  });

  it('포기(삭제)가 실패하면 진행을 그대로 두고 문구를 보인다', async () => {
    const calls = chain({ SellerProductSetActive: () => true, SellerProductDelete: () => true });
    await openCreate('/products/new/preview');
    await fireEvent.press(await screen.findByRole('button', { name: '등록하기' }));
    await fireEvent.press(await submitSheet().findByRole('button', { name: '포기하기' }));
    await waitFor(() => expect(calls.remove).toHaveLength(1));
    expect(await submitSheet().findByRole('button', { name: '포기하기' })).toBeTruthy();
    expect(useDraftStore.getState().progress.productId).toBe('100');
  });

  it('상품을 만들기 전에 실패하면 지울 것이 없어 닫기만 한다', async () => {
    const calls = chain({ SellerProductCreate: () => true });
    await openCreate('/products/new/preview');
    await fireEvent.press(await screen.findByRole('button', { name: '등록하기' }));
    expect(await submitSheet().findByText('아직 만들어진 상품은 없어요')).toBeTruthy();
    await fireEvent.press(submitSheet().getByRole('button', { name: '닫기' }));
    expect(calls.remove).toEqual([]);
    expect(useDraftStore.getState().progress.productId).toBeNull();
  });

  it('만들다 만 상품이 있으면 뒤로 가지 않고 진행 시트를 다시 연다', async () => {
    useDraftStore.getState().setProgress({
      ...useDraftStore.getState().progress,
      productId: '100',
    });
    const router = openCreate('/products/new/preview');
    await router;
    presentSpy.mockClear();
    await fireEvent.press(await screen.findByRole('button', { name: '뒤로 가기' }));
    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(router.getPathname()).toBe('/products/new/preview');
    expect(screen.getByRole('button', { name: '등록 취소' })).toBeTruthy();
  });
});
