import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { graphql, HttpResponse } from 'msw';
import type * as MockReact from 'react';
import type * as MockRN from 'react-native';
import { toast } from 'sonner-native';

import { type SellerStoreFaqTopicsQuery } from '@/graphql/generated/graphql';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { StoreFaqEditScreen } from './faq-edit-screen';
import { StoreFaqListScreen } from './faq-list-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));
interface MockGridProps {
  data: { id: string }[];
  renderItem: (info: { item: { id: string }; index: number }) => MockNode;
  onDragEnd: (params: { data: { id: string }[] }) => void;
}
type MockNode = MockReact.ReactNode;
// renderRouter가 reanimated를 mock으로 바꿔 끼워 실제 Grid가 돌지 않는다 — 가짜로 대신하고 드롭은 버튼으로 흉내 낸다
jest.mock('react-native-sortables', () => {
  const { createElement: h } = jest.requireActual<typeof MockReact>('react');
  const { Pressable, View } = jest.requireActual<typeof MockRN>('react-native');
  const Grid = ({ data, renderItem, onDragEnd }: MockGridProps) =>
    h(
      View,
      null,
      ...data.map((item, index) => h(View, { key: item.id }, renderItem({ item, index }))),
      h(Pressable, {
        testID: 'drop-last-on-top',
        onPress: () => onDragEnd({ data: [...data.slice(-1), ...data.slice(0, -1)] }),
      }),
    );
  return {
    __esModule: true,
    default: { Grid, Handle: ({ children }: { children: MockNode }) => children },
  };
});
jest.mock('sonner-native', () => ({
  Toaster: () => null,
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));

type Topic = SellerStoreFaqTopicsQuery['sellerFaqTopics'][number];
const topic = (id: string, title: string, patch: Partial<Topic> = {}): Topic => ({
  id,
  storeId: '3',
  title,
  answerHtml: '<p>답변</p>',
  sortOrder: Number(id) - 1,
  isActive: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...patch,
});
const TOPICS = [
  topic('1', '픽업 안내', {
    answerHtml:
      '<p><strong>픽업 시간</strong>은 30분 단위예요.</p><ul><li>하루 전까지 주문</li></ul><p><em>감사합니다</em></p>',
  }),
  topic('2', '레터링 글자 수'),
  topic('3', '당일 주문 가능 여부'),
  topic('4', '주차 안내', { isActive: false }),
];

const topics = (list: Topic[] = TOPICS) =>
  graphql.query('SellerStoreFaqTopics', () =>
    HttpResponse.json({ data: { sellerFaqTopics: list } }),
  );
/** 변수를 기록하고 data를 돌려준다 */
function record(operation: string, data: object) {
  const calls: Record<string, unknown>[] = [];
  server.use(
    graphql.operation(({ operationName, variables }) => {
      if (operationName !== operation) return undefined;
      calls.push(variables);
      return HttpResponse.json({ data });
    }),
  );
  return calls;
}

const routes = { 'store/faq/index': StoreFaqListScreen, 'store/faq/[id]': StoreFaqEditScreen };
const open = (initialUrl: string) => renderRouter(routes, { initialUrl, wrapper: Providers });

afterEach(() => jest.clearAllMocks());

describe('자동응답 목록', () => {
  it('항목을 순서대로 그리고 활성 스위치는 그 항목만 바로 저장한다', async () => {
    server.use(topics());
    const calls = record('SellerStoreUpdateFaqTopic', { sellerUpdateFaqTopic: { id: '4' } });
    await open('/store/faq');
    expect(await screen.findByText('항목 4')).toBeTruthy();
    expect(screen.getByRole('switch', { name: '픽업 안내 활성' })).toBeChecked();
    const parking = screen.getByRole('switch', { name: '주차 안내 활성' });
    expect(parking).not.toBeChecked();

    await fireEvent.press(parking);
    await waitFor(() => expect(calls).toEqual([{ input: { topicId: '4', isActive: true } }]));
  });

  it('순서를 바꾸면 바뀐 항목의 sortOrder만 보낸다', async () => {
    server.use(topics());
    const calls = record('SellerStoreUpdateFaqTopic', { sellerUpdateFaqTopic: { id: '1' } });
    await open('/store/faq');
    const handle = await screen.findByLabelText('픽업 안내 순서');

    await fireEvent(handle, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls).toEqual(
      expect.arrayContaining([
        { input: { topicId: '2', sortOrder: 0 } },
        { input: { topicId: '1', sortOrder: 1 } },
      ]),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('순서를 저장했어요'));
  });

  it('끌어 놓은 순서로 sortOrder를 일괄 저장한다', async () => {
    server.use(topics());
    const calls = record('SellerStoreUpdateFaqTopic', { sellerUpdateFaqTopic: { id: '4' } });
    await open('/store/faq');
    await fireEvent.press(await screen.findByTestId('drop-last-on-top'));
    await waitFor(() => expect(calls).toHaveLength(4));
    expect(calls.map((c) => c.input)).toEqual(
      expect.arrayContaining([
        { topicId: '4', sortOrder: 0 },
        { topicId: '1', sortOrder: 1 },
        { topicId: '2', sortOrder: 2 },
        { topicId: '3', sortOrder: 3 },
      ]),
    );
  });

  it('반증: 맨 위 항목을 위로 올리면 아무것도 보내지 않는다', async () => {
    server.use(topics());
    const calls = record('SellerStoreUpdateFaqTopic', { sellerUpdateFaqTopic: { id: '1' } });
    await open('/store/faq');
    await fireEvent(await screen.findByLabelText('픽업 안내 순서'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(calls).toHaveLength(0);
  });

  it('순서 저장이 실패하면 오류를 알린다', async () => {
    server.use(
      topics(),
      graphql.operation(({ operationName }) =>
        operationName === 'SellerStoreUpdateFaqTopic'
          ? HttpResponse.json({
              data: null,
              errors: [
                graphqlError({
                  message: 'FAQ 주제를 찾을 수 없습니다.',
                  code: 'FAQ_TOPIC_NOT_FOUND',
                  classification: 'NOT_FOUND',
                  statusCode: 404,
                }),
              ],
            })
          : undefined,
      ),
    );
    await open('/store/faq');
    await fireEvent(await screen.findByLabelText('주차 안내 순서'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('FAQ 주제를 찾을 수 없습니다.'));
  });

  it('×는 확인 시트를 거쳐 삭제한다', async () => {
    server.use(topics());
    const calls = record('SellerStoreDeleteFaqTopic', { sellerDeleteFaqTopic: true });
    await open('/store/faq');
    await fireEvent.press(await screen.findByRole('button', { name: '레터링 글자 수 삭제' }));
    expect(screen.getByText("'레터링 글자 수' — 삭제하면 자동 응답에서도 빠져요")).toBeTruthy();
    expect(calls).toHaveLength(0);

    await fireEvent.press(screen.getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(calls).toEqual([{ topicId: '2' }]));
    expect(toast.success).toHaveBeenCalledWith('항목을 삭제했어요');
  });

  it('비어 있으면 빈 상태에서 추가 화면으로 간다', async () => {
    server.use(topics([]));
    const router = open('/store/faq');
    await router;
    expect(await screen.findByText('자동응답 항목이 없어요')).toBeTruthy();
    const [, emptyAdd] = screen.getAllByRole('button', { name: '항목 추가' });
    await fireEvent.press(emptyAdd!);
    await waitFor(() => expect(router.getPathname()).toBe('/store/faq/new'));
  });

  it('행 제목을 누르면 편집 화면으로 간다', async () => {
    server.use(topics());
    const router = open('/store/faq');
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '당일 주문 가능 여부 편집' }));
    await waitFor(() => expect(router.getPathname()).toBe('/store/faq/3'));
  });

  it('목록을 못 받으면 다시 시도를 보여 준다', async () => {
    server.use(graphql.query('SellerStoreFaqTopics', () => HttpResponse.json({}, { status: 500 })));
    await open('/store/faq');
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeTruthy();
  });
});

describe('항목 편집', () => {
  it('새 항목: 서식 버튼으로 만든 HTML을 맨 뒤 순서로 저장하고 목록으로 돌아간다', async () => {
    server.use(topics());
    const calls = record('SellerStoreCreateFaqTopic', { sellerCreateFaqTopic: { id: '5' } });
    const router = open('/store/faq');
    await router;
    expect(await screen.findByText('항목 4')).toBeTruthy();
    const [, addLine] = screen.getAllByRole('button', { name: '항목 추가' });
    await fireEvent.press(addLine!);
    await fireEvent.press(await screen.findByRole('button', { name: '저장' }));
    expect(screen.getByText('제목을 입력해 주세요')).toBeTruthy();
    expect(screen.getByText('답변을 입력해 주세요')).toBeTruthy();
    expect(calls).toHaveLength(0);

    await fireEvent.changeText(screen.getByLabelText('제목'), ' 포장 안내 ');
    const answer = screen.getByLabelText('답변');
    await fireEvent.changeText(answer, '보냉 포장');
    await fireEvent(answer, 'selectionChange', {
      nativeEvent: { selection: { start: 0, end: 2 } },
    });
    await fireEvent.press(screen.getByRole('button', { name: '굵게' }));
    await fireEvent.changeText(answer, '**보냉** 포장\n아이스팩 포함');
    await fireEvent(answer, 'selectionChange', {
      nativeEvent: { selection: { start: 12, end: 12 } },
    });
    await fireEvent.press(screen.getByRole('button', { name: '• 목록' }));
    expect(answer).toHaveDisplayValue('**보냉** 포장\n• 아이스팩 포함');
    expect(screen.getByText('아이스팩 포함')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(calls).toEqual([
        {
          input: {
            title: '포장 안내',
            answerHtml: '<p><strong>보냉</strong> 포장</p><ul><li>아이스팩 포함</li></ul>',
            isActive: true,
            sortOrder: 4,
          },
        },
      ]),
    );
    await waitFor(() => expect(router.getPathname()).toBe('/store/faq'));
    expect(toast.success).toHaveBeenCalledWith('저장되었습니다');
  });

  it('반증: 미리보기는 입력한 태그를 실행하지 않고 글자로 보여 준다', async () => {
    server.use(topics());
    await open('/store/faq/new');
    expect(
      await screen.findByText('답변을 입력하면 채팅에 보이는 모습이 여기에 나와요'),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText('답변'),
      '<script>alert(1)</script><b>굵게</b>',
    );
    expect(await screen.findByText('<script>alert(1)</script><b>굵게</b>')).toBeTruthy();
  });

  it('반증: 답변을 건드리지 않으면 answerHtml을 보내지 않아 원래 서식(em)을 지킨다', async () => {
    server.use(topics());
    const calls = record('SellerStoreUpdateFaqTopic', { sellerUpdateFaqTopic: { id: '1' } });
    await open('/store/faq/1');
    const answer = await screen.findByLabelText('답변');
    expect(answer).toHaveDisplayValue(
      '**픽업 시간**은 30분 단위예요.\n• 하루 전까지 주문\n감사합니다',
    );
    await fireEvent.changeText(screen.getByLabelText('제목'), '픽업 시간 안내');
    await fireEvent.press(screen.getByRole('switch', { name: '활성' }));
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(calls).toEqual([
        { input: { topicId: '1', title: '픽업 시간 안내', isActive: false } },
      ]),
    );
  });

  it('답변을 고치면 새 HTML을 보낸다', async () => {
    server.use(topics());
    const calls = record('SellerStoreUpdateFaqTopic', { sellerUpdateFaqTopic: { id: '2' } });
    await open('/store/faq/2');
    await fireEvent.changeText(await screen.findByLabelText('답변'), '최대 20자');
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(calls).toEqual([
        {
          input: {
            topicId: '2',
            title: '레터링 글자 수',
            answerHtml: '<p>최대 20자</p>',
            isActive: true,
          },
        },
      ]),
    );
  });

  it('저장이 실패하면 오류 문구를 띄우고 머문다', async () => {
    server.use(
      topics(),
      graphql.operation(({ operationName }) =>
        operationName === 'SellerStoreUpdateFaqTopic'
          ? HttpResponse.json({
              data: null,
              errors: [
                graphqlError({
                  message: '필수 텍스트가 비어 있습니다.',
                  code: 'TEXT_REQUIRED',
                  classification: 'BAD_USER_INPUT',
                  statusCode: 400,
                }),
              ],
            })
          : undefined,
      ),
    );
    await open('/store/faq/2');
    await fireEvent.press(await screen.findByRole('button', { name: '저장' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('필수 항목을 입력해 주세요.'));
    expect(screen.getByLabelText('제목')).toHaveDisplayValue('레터링 글자 수');
  });

  it('편집 화면의 삭제도 확인 뒤 지우고 목록으로 돌아간다', async () => {
    server.use(topics());
    const calls = record('SellerStoreDeleteFaqTopic', { sellerDeleteFaqTopic: true });
    const router = open('/store/faq');
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '주차 안내 편집' }));
    await fireEvent.press(await screen.findByRole('button', { name: '이 항목 삭제' }));
    await fireEvent.press(screen.getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(calls).toEqual([{ topicId: '4' }]));
    await waitFor(() => expect(router.getPathname()).toBe('/store/faq'));
  });

  it('없는 항목은 안내만 보여 준다', async () => {
    server.use(topics());
    await open('/store/faq/99');
    expect(await screen.findByText('삭제되었거나 찾을 수 없는 항목이에요')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
  });
});
