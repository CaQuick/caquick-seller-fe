import { launchImageLibraryAsync } from 'expo-image-picker';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import type * as MockReact from 'react';
import type * as MockRN from 'react-native';
import { type PanGesture, State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { toast } from 'sonner-native';

import { type SellerProductManageQuery } from '@/graphql/generated/graphql';
import { mockFileSizes } from '@/test/mocks';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, Providers } from '@/test/render';

import { TEMPLATE_COPY } from '../model/template-slots';
import { ProductCustomTemplateScreen } from './template-screen';

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
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      crop: jest.fn(),
      resize: jest.fn(),
      renderAsync: () =>
        Promise.resolve({ saveAsync: () => Promise.resolve({ uri: 'file:///cache/p.jpg' }) }),
    }),
  },
}));

type Template = NonNullable<SellerProductManageQuery['sellerProduct']['customTemplate']>;

const TEMPLATE: Template = {
  id: 'ct1',
  baseImageUrl: 'https://img/base.jpg',
  freeEditEnabled: false,
  textTokens: [
    {
      id: 'k1',
      tokenKey: 'slot1',
      label: '이름',
      defaultText: '생일 축하해',
      maxLength: 10,
      isRequired: true,
      posX: 1000,
      posY: 2000,
      width: 4000,
      height: 1000,
      textColor: '#1D1D1D',
      textAlign: 'CENTER',
    },
    {
      id: 'k2',
      tokenKey: 'message',
      label: '메시지',
      defaultText: '오늘도 행복한 하루 보내',
      maxLength: 30,
      isRequired: false,
      posX: 1000,
      posY: 3000,
      width: 8000,
      height: 1500,
      textColor: '#000000',
      textAlign: 'LEFT',
    },
  ],
};
const PRESETS = ['#1D1D1D', '#FF5A5A'];

const FAIL = graphqlError({
  message: '잠시 후 다시 시도해 주세요.',
  code: 'TEMPORARY_UNAVAILABLE',
  classification: 'INTERNAL_SERVER_ERROR',
  statusCode: 503,
});

/** 조회는 고정 템플릿, mutation은 변수를 기록한다. fail(operation, n)이 참이면 오류로 답한다 */
function serve(template: Template | null, fail?: (operation: string, n: number) => boolean) {
  const calls: Record<string, Record<string, unknown>[]> = {};
  server.use(
    graphql.operation(({ operationName, variables }) => {
      if (operationName === 'SellerProductManage')
        return HttpResponse.json({
          data: {
            sellerProduct: {
              id: '7',
              customMode: 'SLOT',
              optionGroups: [],
              customTemplate: template,
            },
          },
        });
      if (operationName === 'SellerCustomCatalog')
        return HttpResponse.json({
          data: {
            customThreeDCatalog: { revision: 1, optionChoices: [], textColorPresets: PRESETS },
          },
        });
      const list = (calls[operationName] ??= []);
      list.push(variables);
      if (fail?.(operationName, list.length))
        return HttpResponse.json({ data: null, errors: [FAIL] });
      const data: Record<string, () => unknown> = {
        SellerUploadsCreateUploadUrl: () => ({
          sellerCreateUploadUrl: { uploadUrl: 'https://s3/1', publicUrl: 'https://cdn/1.jpg' },
        }),
        SellerProductUpsertTemplate: () => ({ sellerUpsertProductCustomTemplate: { id: 'ct9' } }),
        SellerProductUpsertTextToken: () => ({
          sellerUpsertProductCustomTextToken: {
            id: (variables.input as { tokenId?: string }).tokenId ?? `new${list.length}`,
          },
        }),
      };
      return HttpResponse.json({ data: data[operationName]?.() ?? {} });
    }),
  );
  return calls;
}

function open() {
  const queryClient = createTestQueryClient();
  return renderRouter(
    { 'products/[id]/custom-template': ProductCustomTemplateScreen },
    {
      initialUrl: '/products/7/custom-template',
      wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    },
  );
}

const saveButton = () => screen.getByRole('button', { name: TEMPLATE_COPY.save });
const drag = (testId: string, dx: number, dy: number) =>
  act(() => {
    fireGestureHandler<PanGesture>(getByGestureTestId(testId), [
      { state: State.BEGAN },
      { state: State.ACTIVE, translationX: dx / 2, translationY: dy / 2 },
      { translationX: dx, translationY: dy },
      { state: State.END },
    ]);
    return Promise.resolve();
  });

describe('ProductCustomTemplateScreen', () => {
  beforeEach(() => {
    jest.mocked(toast.error).mockClear();
    jest.mocked(toast.success).mockClear();
    mockFileSizes.set('file:///cache/p.jpg', 2048);
  });

  it('템플릿이 없으면 베이스 이미지부터 올리고, 저장하면 템플릿을 만든다', async () => {
    const calls = serve(null);
    jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', width: 800, height: 800 }],
    } as never);
    await open();
    expect(await screen.findByText(TEMPLATE_COPY.needBase)).toBeTruthy();
    expect(screen.getByRole('button', { name: '슬롯 추가' })).toBeDisabled();
    expect(saveButton()).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: '이미지 추가 (0/1)' }));
    expect(await screen.findByLabelText(TEMPLATE_COPY.base)).toBeTruthy();
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(TEMPLATE_COPY.saved));
    expect(launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }),
    );
    expect(calls.SellerProductUpsertTemplate).toEqual([
      { input: { productId: '7', baseImageUrl: 'https://cdn/1.jpg', freeEditEnabled: false } },
    ]);
  });

  it('자유 편집 스위치는 템플릿 저장으로 보낸다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await fireEvent.press(await screen.findByRole('switch', { name: TEMPLATE_COPY.freeEdit }));
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductUpsertTemplate).toEqual([
      { input: { productId: '7', baseImageUrl: 'https://img/base.jpg', freeEditEnabled: true } },
    ]);
    expect(calls.SellerProductUpsertTextToken).toBeUndefined();
  });

  it('슬롯을 비율 좌표의 박스와 카드로 그린다', async () => {
    serve(TEMPLATE);
    await open();
    expect(await screen.findByLabelText('이름 위치')).toHaveStyle({
      left: 28.5,
      top: 57,
      width: 114,
      height: 28.5,
    });
    expect(screen.getByLabelText('메시지 위치')).toHaveStyle({ left: 28.5, top: 85.5 });
    expect(screen.getByLabelText('이름 표시 이름')).toHaveDisplayValue('이름');
    expect(screen.getByLabelText('이름 기본 문구')).toHaveDisplayValue('생일 축하해');
    expect(screen.getByText('기본 문구 · 6/10자')).toBeTruthy();
    expect(screen.getByRole('switch', { name: '메시지 필수 입력' })).not.toBeChecked();
    expect(
      await screen.findByRole('button', { name: '이름 글자색 #1D1D1D', selected: true }),
    ).toBeTruthy();
    expect(
      within(screen.getByLabelText('메시지 정렬')).getByRole('tab', { name: '왼쪽' }),
    ).toBeSelected();
    expect(screen.queryByLabelText('치환 키')).toBeNull();
    expect(saveButton()).toBeDisabled();
  });

  it('기본 문구를 잰 줄 폭으로 규칙대로 크기를 정해 박스 안에 그린다', async () => {
    serve(TEMPLATE);
    await open();
    const measure = await screen.findByTestId('slot-measure-k1', { includeHiddenElements: true });
    expect(screen.queryByText('생일 축하해')).toBeNull();
    // 한 줄인데 두 줄로 쟀다면(자동 줄바꿈) 쓰지 않는다
    await fireEvent(measure, 'textLayout', {
      nativeEvent: { lines: [{ width: 120 }, { width: 80 }] },
    });
    expect(screen.queryByText('생일 축하해')).toBeNull();
    // 40px에서 200px → 폭 4000·높이 1000 상자에서 800(높이와 폭이 같이 정함), 한 변 285px
    await fireEvent(measure, 'textLayout', { nativeEvent: { lines: [{ width: 200 }] } });
    expect(screen.getByText('생일 축하해')).toHaveStyle({
      fontSize: 22.8,
      lineHeight: 28.5,
      top: 0,
      textAlign: 'center',
      color: '#1D1D1D',
      fontFamily: 'Pretendard',
      fontWeight: '700',
    });

    // 정렬은 줄마다 상자 폭 안에서, 색 코드가 틀린 동안은 기본 글자색으로 그린다
    await fireEvent(
      await screen.findByTestId('slot-measure-k2', { includeHiddenElements: true }),
      'textLayout',
      { nativeEvent: { lines: [{ width: 400 }] } },
    );
    expect(screen.getByText('오늘도 행복한 하루 보내')).toHaveStyle({ textAlign: 'left' });
    await fireEvent.press(
      within(screen.getByLabelText('메시지 정렬')).getByRole('tab', { name: '오른쪽' }),
    );
    await fireEvent.changeText(screen.getByLabelText('메시지 글자색 코드'), '#12');
    const preview = screen.getByText('오늘도 행복한 하루 보내');
    expect(preview).toHaveStyle({ textAlign: 'right' });
    expect(preview).not.toHaveStyle({ color: '#000000' });
  });

  it('글자색·정렬을 바꾸면 그 슬롯만 보내고, 색 코드가 틀리면 막는다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '이름 글자색 #FF5A5A' }));
    await fireEvent.press(
      within(screen.getByLabelText('메시지 정렬')).getByRole('tab', { name: '오른쪽' }),
    );
    await fireEvent.changeText(screen.getByLabelText('메시지 글자색 코드'), '#12345');
    await fireEvent.press(saveButton());
    expect(screen.getByText('#RRGGBB 형식으로 입력해 주세요')).toBeTruthy();
    expect(calls.SellerProductUpsertTextToken).toBeUndefined();

    await fireEvent.changeText(screen.getByLabelText('메시지 글자색 코드'), '#12345a');
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductUpsertTextToken?.map((c) => c.input)).toEqual([
      expect.objectContaining({ tokenId: 'k1', textColor: '#FF5A5A', textAlign: 'CENTER' }),
      expect.objectContaining({ tokenId: 'k2', textColor: '#12345A', textAlign: 'RIGHT' }),
    ]);
  });

  it('박스를 끌면 비율 좌표로 옮기고, 모서리를 끌면 크기를 바꿔 그 슬롯만 저장한다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await screen.findByLabelText('이름 위치');
    await drag('slot-move-k1', 28.5, -28.5);
    await drag('slot-resize-k1', 57, 0);
    expect(screen.getByLabelText('이름 위치')).toHaveStyle({ left: 57, top: 28.5, width: 171 });
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductUpsertTextToken).toEqual([
      {
        input: {
          tokenId: 'k1',
          templateId: 'ct1',
          tokenKey: 'slot1',
          label: '이름',
          defaultText: '생일 축하해',
          maxLength: 10,
          isRequired: true,
          sortOrder: 0,
          posX: 2000,
          posY: 1000,
          width: 6000,
          height: 1000,
          textColor: '#1D1D1D',
          textAlign: 'CENTER',
        },
      },
    ]);
    expect(calls.SellerProductReorderTextTokens).toBeUndefined();
  });

  it('저장된 슬롯은 확인 뒤 지우고, 저장 때 삭제를 보낸다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '이름 슬롯 삭제' }));
    expect(screen.getByRole('header', { name: "'이름' 슬롯을 삭제할까요?" })).toBeTruthy();
    expect(screen.getByLabelText('이름 위치')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '삭제하기' }));
    expect(screen.queryByLabelText('이름 위치')).toBeNull();
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductDeleteTextToken).toEqual([{ tokenId: 'k1' }]);
    expect(calls.SellerProductUpsertTextToken).toBeUndefined();
  });

  it('새 슬롯은 검증을 거쳐 맨 뒤 순서로 만들고, 저장 전이면 확인 없이 지운다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '슬롯 추가' }));
    await fireEvent.press(screen.getByRole('button', { name: '슬롯 3 슬롯 삭제' }));
    expect(screen.queryByLabelText('슬롯 3 위치')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: '슬롯 추가' }));
    await fireEvent.press(saveButton());
    expect(screen.getByText('표시 이름을 입력해 주세요')).toBeTruthy();
    expect(screen.getByText('기본 문구를 입력해 주세요')).toBeTruthy();
    expect(calls.SellerProductUpsertTextToken).toBeUndefined();

    await fireEvent.changeText(screen.getByLabelText('슬롯 3 표시 이름'), '닉네임');
    await fireEvent.changeText(screen.getByLabelText('닉네임 기본 문구'), '축하해요');
    await fireEvent.changeText(screen.getByLabelText('닉네임 최대 글자 수'), '3');
    await fireEvent.press(saveButton());
    expect(screen.getByText('최대 글자 수(3자)보다 길어요')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('닉네임 최대 글자 수'), '8');
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductUpsertTextToken?.map((c) => c.input)).toEqual([
      expect.objectContaining({
        tokenKey: 'slot2',
        label: '닉네임',
        maxLength: 8,
        sortOrder: 2,
        textColor: '#000000',
        textAlign: 'CENTER',
      }),
    ]);
    expect(calls.SellerProductUpsertTextToken?.[0]?.input).not.toHaveProperty('tokenId');
    expect(calls.SellerProductReorderTextTokens).toBeUndefined();
  });

  it('같은 저장에서 지운 자리의 키는 새 자리에 다시 쓰지 않는다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '이름 슬롯 삭제' }));
    await fireEvent.press(screen.getByRole('button', { name: '삭제하기' }));
    await fireEvent.press(screen.getByRole('button', { name: '슬롯 추가' }));
    await fireEvent.changeText(screen.getByLabelText('슬롯 2 표시 이름'), '이니셜');
    await fireEvent.changeText(screen.getByLabelText('이니셜 기본 문구'), 'A');
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductDeleteTextToken).toEqual([{ tokenId: 'k1' }]);
    expect(calls.SellerProductUpsertTextToken?.map((c) => c.input)).toEqual([
      expect.objectContaining({ tokenKey: 'slot2', label: '이니셜' }),
    ]);
  });

  it('카드 순서를 바꾸면 슬롯 id 전체로 순서를 보낸다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await fireEvent.press(await screen.findByTestId('reverse'));
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductReorderTextTokens).toEqual([
      { input: { templateId: 'ct1', tokenIds: ['k2', 'k1'] } },
    ]);
  });

  it('중간에 실패하면 알리고, 다시 저장하면 남은 요청만 보낸다', async () => {
    const calls = serve(TEMPLATE, (op, n) => op === 'SellerProductUpsertTextToken' && n === 1);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: '메시지 슬롯 삭제' }));
    await fireEvent.press(screen.getByRole('button', { name: '삭제하기' }));
    await fireEvent.press(screen.getByRole('switch', { name: '이름 필수 입력' }));
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('잠시 후 다시 시도해 주세요.'));
    expect(toast.success).not.toHaveBeenCalled();

    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductDeleteTextToken).toEqual([{ tokenId: 'k2' }]);
    expect(calls.SellerProductUpsertTextToken).toHaveLength(2);
  });
});
