import { launchImageLibraryAsync } from 'expo-image-picker';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
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
  isActive: true,
  textTokens: [
    {
      id: 'k1',
      tokenKey: 'name',
      defaultText: '생일 축하해',
      maxLength: 10,
      isRequired: true,
      posX: 1000,
      posY: 2000,
      width: 4000,
      height: 1000,
    },
    {
      id: 'k2',
      tokenKey: 'message',
      defaultText: '오늘도 행복한 하루 보내',
      maxLength: 30,
      isRequired: false,
      posX: null,
      posY: null,
      width: null,
      height: null,
    },
  ],
};

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
          data: { sellerProduct: { id: '7', optionGroups: [], customTemplate: template } },
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
    expect(calls.SellerProductUpsertTemplate).toEqual([
      { input: { productId: '7', baseImageUrl: 'https://cdn/1.jpg', isActive: true } },
    ]);
  });

  it('슬롯을 박스와 카드로 그리고, 위치가 없는 슬롯은 기본 자리에 둔다', async () => {
    serve(TEMPLATE);
    await open();
    expect(await screen.findByLabelText('name 위치')).toHaveStyle({
      left: 28.5,
      top: 57,
      width: 114,
      height: 28.5,
    });
    expect(screen.getByLabelText('message 위치')).toHaveStyle({ left: 28.5, top: 85.5 });
    expect(screen.getByLabelText('name 기본 문구')).toHaveDisplayValue('생일 축하해');
    expect(screen.getByRole('switch', { name: 'message 필수 입력' })).not.toBeChecked();
    expect(saveButton()).toBeDisabled();
  });

  it('사용을 끄면 안내를 보이고, 저장은 활성 전환 하나만 보낸다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await fireEvent.press(await screen.findByRole('switch', { name: TEMPLATE_COPY.useTitle }));
    expect(screen.getByText(TEMPLATE_COPY.offGuide)).toBeTruthy();
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls).toEqual({
      SellerProductSetTemplateActive: [{ input: { templateId: 'ct1', isActive: false } }],
    });
  });

  it('박스를 끌면 비율 좌표로 옮기고, 모서리를 끌면 크기를 바꿔 그 슬롯만 저장한다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await screen.findByLabelText('name 위치');
    await drag('slot-move-k1', 28.5, -28.5);
    await drag('slot-resize-k1', 57, 0);
    expect(screen.getByLabelText('name 위치')).toHaveStyle({ left: 57, top: 28.5, width: 171 });
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductUpsertTextToken).toEqual([
      {
        input: {
          tokenId: 'k1',
          templateId: 'ct1',
          tokenKey: 'name',
          defaultText: '생일 축하해',
          maxLength: 10,
          isRequired: true,
          sortOrder: 0,
          posX: 2000,
          posY: 1000,
          width: 6000,
          height: 1000,
        },
      },
    ]);
    expect(calls.SellerProductReorderTextTokens).toBeUndefined();
  });

  it('저장된 슬롯은 확인 뒤 지우고, 저장 때 삭제를 보낸다', async () => {
    const calls = serve(TEMPLATE);
    await open();
    await fireEvent.press(await screen.findByRole('button', { name: 'name 슬롯 삭제' }));
    expect(screen.getByRole('header', { name: "'name' 슬롯을 삭제할까요?" })).toBeTruthy();
    expect(screen.getByLabelText('name 위치')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '삭제하기' }));
    expect(screen.queryByLabelText('name 위치')).toBeNull();
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
    expect(screen.getByText('영문 소문자·숫자로 입력해 주세요')).toBeTruthy();
    expect(screen.getByText('기본 문구를 입력해 주세요')).toBeTruthy();
    expect(calls.SellerProductUpsertTextToken).toBeUndefined();

    await fireEvent.changeText(screen.getByLabelText('슬롯 3 치환 키'), 'name');
    await fireEvent.press(saveButton());
    expect(screen.getAllByText('다른 슬롯과 겹치지 않게 입력해 주세요')).toHaveLength(2);

    await fireEvent.changeText(screen.getAllByLabelText('name 치환 키')[1]!, 'nick');
    await fireEvent.changeText(screen.getByLabelText('nick 기본 문구'), '축하해');
    await fireEvent.changeText(screen.getByLabelText('nick 최대 글자 수'), '8');
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductUpsertTextToken?.map((c) => c.input)).toEqual([
      expect.objectContaining({ tokenKey: 'nick', maxLength: 8, sortOrder: 2 }),
    ]);
    expect(calls.SellerProductUpsertTextToken?.[0]?.input).not.toHaveProperty('tokenId');
    expect(calls.SellerProductReorderTextTokens).toBeUndefined();
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
    await fireEvent.press(await screen.findByRole('switch', { name: TEMPLATE_COPY.useTitle }));
    await fireEvent.press(screen.getByRole('switch', { name: 'name 필수 입력' }));
    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('잠시 후 다시 시도해 주세요.'));
    expect(toast.success).not.toHaveBeenCalled();

    await fireEvent.press(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(calls.SellerProductSetTemplateActive).toHaveLength(1);
    expect(calls.SellerProductUpsertTextToken).toHaveLength(2);
  });
});
