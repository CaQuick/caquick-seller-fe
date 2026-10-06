import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import type React from 'react';
import type * as ReactNative from 'react-native';
import { toast } from 'sonner-native';

import {
  type SellerStoreUpsertBusinessHourMutation,
  type SellerUpsertStoreBusinessHourInput,
} from '@/graphql/generated/graphql';
import { hmToDate } from '@/shared/ui/time-row';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { StoreBusinessHoursScreen } from './business-hours-screen';
import { StoreDailyCapacitiesScreen } from './daily-capacities-screen';
import { StoreSpecialClosuresScreen } from './special-closures-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));
jest.mock('sonner-native', () => ({
  Toaster: () => null,
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    __esModule: true,
    default: (props: object) => createElement(View, { testID: 'time-picker', ...props }),
  };
});

const query = (operation: string, data: object) =>
  graphql.query(operation, () => HttpResponse.json({ data }));
const fail = (operation: string, code: string, message: string) =>
  graphql.operation(({ operationName }) =>
    operationName === operation
      ? HttpResponse.json({
          data: null,
          errors: [
            graphqlError({ message, code, classification: 'BAD_USER_INPUT', statusCode: 400 }),
          ],
        })
      : undefined,
  );
function record(operation: string, data: (vars: Record<string, unknown>) => object) {
  const calls: Record<string, unknown>[] = [];
  server.use(
    graphql.operation(({ operationName, variables }) => {
      if (operationName !== operation) return undefined;
      calls.push(variables);
      return HttpResponse.json({ data: data(variables) });
    }),
  );
  return calls;
}

const T = (hm: string) => `1970-01-01T${hm}:00.000Z`;
const hour = (dayOfWeek: number, open: string | null, close: string | null) => ({
  id: `h${dayOfWeek}`,
  dayOfWeek,
  isClosed: open === null,
  openTime: open && T(open),
  closeTime: close && T(close),
});
/** 월–금 10–19 · 토 10–17 · 일 휴무 */
const HOURS = [
  ...[1, 2, 3, 4, 5].map((d) => hour(d, '10:00', '19:00')),
  hour(6, '10:00', '17:00'),
  hour(0, null, null),
];
const hoursOk = () => query('SellerStoreBusinessHours', { sellerStoreBusinessHours: HOURS });

const routes = {
  'store/business-hours': StoreBusinessHoursScreen,
  'store/special-closures': StoreSpecialClosuresScreen,
  'store/daily-capacities': StoreDailyCapacitiesScreen,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl, wrapper: Providers });

// 오늘은 2026-10-06(화) KST — Date만 고정
beforeAll(() =>
  jest.useFakeTimers({
    now: new Date('2026-10-06T03:00:00.000Z'),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  }),
);
afterAll(() => jest.useRealTimers());
afterEach(() => jest.clearAllMocks());

describe('영업시간', () => {
  const upsert = () =>
    record('SellerStoreUpsertBusinessHour', () => ({
      sellerUpsertStoreBusinessHour: { id: 'h' },
    }));

  it('요일 7행을 월요일부터 그리고, 휴무 요일은 시각 대신 휴무', async () => {
    server.use(hoursOk());
    await open('/store/business-hours');
    expect(await screen.findByRole('button', { name: '월 시작 시각' })).toHaveAccessibilityValue({
      text: '10:00',
    });
    expect(screen.getByRole('button', { name: '토 종료 시각' })).toHaveAccessibilityValue({
      text: '17:00',
    });
    expect(screen.getByRole('switch', { name: '일 영업' })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: '일 시작 시각' })).toBeNull();
    const days = screen.getAllByRole('switch').map((s) => s.props.accessibilityLabel as string);
    expect(days).toEqual([
      '월 영업',
      '화 영업',
      '수 영업',
      '목 영업',
      '금 영업',
      '토 영업',
      '일 영업',
    ]);
  });

  it('스위치를 켜면 그 요일만 기본 시각으로 바로 저장한다 — 시각은 UTC 시·분 그대로', async () => {
    server.use(hoursOk());
    const calls = upsert();
    await open('/store/business-hours');
    await fireEvent.press(await screen.findByRole('switch', { name: '일 영업' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      input: {
        dayOfWeek: 0,
        isClosed: false,
        openTime: '1970-01-01T10:00:00.000Z',
        closeTime: '1970-01-01T19:00:00.000Z',
      },
    });
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('일요일 영업시간이 저장되었습니다'),
    );
  });

  it('스위치를 끄면 시각 없이 휴무로 저장한다', async () => {
    server.use(hoursOk());
    const calls = upsert();
    await open('/store/business-hours');
    await fireEvent.press(await screen.findByRole('switch', { name: '월 영업' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      input: { dayOfWeek: 1, isClosed: true, openTime: null, closeTime: null },
    });
  });

  it('피커로 종료 시각을 바꾸면 그 행을 저장한다', async () => {
    server.use(hoursOk());
    const calls = upsert();
    await open('/store/business-hours');
    await fireEvent.press(await screen.findByRole('button', { name: '토 종료 시각' }));
    await fireEvent(screen.getByTestId('time-picker'), 'valueChange', {}, hmToDate('18:30'));
    await fireEvent.press(screen.getByRole('button', { name: '완료' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      input: { dayOfWeek: 6, isClosed: false, openTime: T('10:00'), closeTime: T('18:30') },
    });
  });

  it('반증: 종료가 시작보다 이르면 저장하지 않고 행 아래에 알린다', async () => {
    server.use(hoursOk());
    const calls = upsert();
    await open('/store/business-hours');
    await fireEvent.press(await screen.findByRole('button', { name: '화 종료 시각' }));
    await fireEvent(screen.getByTestId('time-picker'), 'valueChange', {}, hmToDate('09:00'));
    await fireEvent.press(screen.getByRole('button', { name: '완료' }));
    expect(await screen.findByText('종료 시각은 시작보다 늦어야 해요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '화 종료 시각' })).toHaveAccessibilityValue({
      text: '09:00',
    });
    expect(calls).toHaveLength(0);
  });

  it('저장이 실패하면 토스트로 알리고 서버 값으로 되돌린다', async () => {
    server.use(hoursOk(), fail('SellerStoreUpsertBusinessHour', 'INVALID_TIME_VALUE', 'x'));
    await open('/store/business-hours');
    await fireEvent.press(await screen.findByRole('switch', { name: '수 영업' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('x'));
    expect(screen.getByRole('switch', { name: '수 영업' })).toBeChecked();
  });

  it('같은 요일을 연달아 바꾸면 앞 저장이 끝난 뒤 마지막 편집만 이어 보내 서버에도 마지막 편집이 남는다', async () => {
    let saved = HOURS;
    const calls: SellerUpsertStoreBusinessHourInput[] = [];
    const releases: (() => void)[] = [];
    server.use(
      graphql.query('SellerStoreBusinessHours', () =>
        HttpResponse.json({ data: { sellerStoreBusinessHours: saved } }),
      ),
      graphql.mutation<
        SellerStoreUpsertBusinessHourMutation,
        { input: SellerUpsertStoreBusinessHourInput }
      >('SellerStoreUpsertBusinessHour', async ({ variables: { input } }) => {
        calls.push(input);
        // 앞 두 요청은 풀어 줄 때 반영된다 — 그사이 뒤 요청이 먼저 반영되면 순서가 뒤집힌다
        if (calls.length <= 2) await new Promise<void>((resolve) => releases.push(resolve));
        saved = saved.map((h) =>
          h.dayOfWeek === input.dayOfWeek
            ? {
                ...h,
                isClosed: input.isClosed,
                openTime: input.openTime ?? null,
                closeTime: input.closeTime ?? null,
              }
            : h,
        );
        return HttpResponse.json({
          data: { sellerUpsertStoreBusinessHour: { id: `h${input.dayOfWeek}` } },
        });
      }),
    );
    const day = () => screen.getByRole('switch', { name: '월 영업' });
    const end = () => screen.getByRole('button', { name: '월 종료 시각' });
    await open('/store/business-hours');
    await fireEvent.press(await screen.findByRole('switch', { name: '월 영업' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    await fireEvent.press(day());
    await fireEvent.press(end());
    await fireEvent(screen.getByTestId('time-picker'), 'valueChange', {}, hmToDate('18:00'));
    await fireEvent.press(screen.getByRole('button', { name: '완료' }));

    // 첫 저장이 끝나야 다음을 보내고, 그사이 낀 편집(다시 영업 10–19)은 건너뛴다
    releases[0]!();
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls).toEqual([
      { dayOfWeek: 1, isClosed: true, openTime: null, closeTime: null },
      { dayOfWeek: 1, isClosed: false, openTime: T('10:00'), closeTime: T('18:00') },
    ]);
    // 앞 저장이 끝나도 아직 저장 중인 마지막 편집을 지우지 않는다
    expect(day()).toBeChecked();
    expect(end()).toHaveAccessibilityValue({ text: '18:00' });

    releases[1]!();
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(2));
    expect(toast.success).toHaveBeenCalledWith('월요일 영업시간이 저장되었습니다');
    expect(saved.find((h) => h.dayOfWeek === 1)).toEqual(hour(1, '10:00', '18:00'));
    expect(day()).toBeChecked();
    expect(end()).toHaveAccessibilityValue({ text: '18:00' });
  });
});

describe('특별휴무', () => {
  const closures = (items: { id: string; closureDate: string; reason: string | null }[]) =>
    query('SellerStoreSpecialClosures', {
      sellerStoreSpecialClosures: {
        items,
        totalCount: items.length,
        hasMore: false,
        nextCursor: null,
      },
    });
  const LIST = [
    { id: 'c3', closureDate: '2026-10-23T00:00:00.000Z', reason: '재료 수급' },
    { id: 'c1', closureDate: '2026-10-05T00:00:00.000Z', reason: '지난 휴무' },
    { id: 'c2', closureDate: '2026-10-09T00:00:00.000Z', reason: '한글날' },
    { id: 'c4', closureDate: '2026-10-07T00:00:00.000Z', reason: null },
  ];

  it('지난 휴무를 빼고 날짜순으로 보인다 — 사유가 없으면 휴무', async () => {
    server.use(hoursOk(), closures(LIST));
    await open('/store/special-closures');
    await screen.findByText('예정된 휴무');
    const rows = screen.getAllByText(/^10월 \d+일 \(.\)$/).map((t) => t.props.children as string);
    expect(rows).toEqual(['10월 7일 (수)', '10월 9일 (금)', '10월 23일 (금)']);
    expect(screen.queryByText('지난 휴무')).toBeNull();
    expect(screen.getAllByText('휴무').length).toBeGreaterThan(0);
  });

  it('× 를 누르면 확인 없이 삭제하고 목록을 다시 받는다', async () => {
    let fetched = 0;
    server.use(
      hoursOk(),
      graphql.query('SellerStoreSpecialClosures', () => {
        fetched += 1;
        return HttpResponse.json({
          data: {
            sellerStoreSpecialClosures: {
              items: fetched === 1 ? LIST : LIST.slice(0, 2),
              totalCount: 2,
              hasMore: false,
              nextCursor: null,
            },
          },
        });
      }),
    );
    const calls = record('SellerStoreDeleteSpecialClosure', () => ({
      sellerDeleteStoreSpecialClosure: true,
    }));
    await open('/store/special-closures');
    await fireEvent.press(await screen.findByRole('button', { name: '10월 9일 (금) 휴무 삭제' }));
    await waitFor(() => expect(calls).toEqual([{ closureId: 'c2' }]));
    await waitFor(() => expect(screen.queryByText('한글날')).toBeNull());
    expect(toast.success).toHaveBeenCalledWith('휴무를 삭제했어요');
  });

  it('비어 있으면 안내와 추가 버튼', async () => {
    server.use(hoursOk(), closures([]));
    await open('/store/special-closures');
    expect(await screen.findByText('등록된 특별휴무가 없어요')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '휴무 추가' }).length).toBeGreaterThan(0);
  });

  it('달력에서 날짜를 고르고 사유와 함께 UTC 자정 날짜로 저장한다', async () => {
    server.use(hoursOk(), closures(LIST));
    const calls = record('SellerStoreUpsertSpecialClosure', () => ({
      sellerUpsertStoreSpecialClosure: { id: 'new' },
    }));
    await open('/store/special-closures');
    const save = await screen.findByRole('button', { name: '저장' });
    expect(save).toBeDisabled();
    // 반증: 지난 날·정기 휴무 요일(일)·이미 등록한 날은 고를 수 없다
    expect(screen.getByRole('button', { name: '10월 5일' })).toBeDisabled();
    await fireEvent.press(await screen.findByRole('button', { name: '10월 11일, 휴무' }));
    await fireEvent.press(screen.getByRole('button', { name: '10월 9일, 휴무' }));
    expect(save).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: '10월 15일' }));
    expect(screen.getByRole('button', { name: '10월 15일' })).toBeSelected();
    await fireEvent.changeText(screen.getByLabelText('사유'), ' 창립기념일 ');
    await fireEvent.press(save);
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      input: { closureDate: '2026-10-15T00:00:00.000Z', reason: '창립기념일' },
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('휴무를 추가했어요'));
  });

  it('지난 달로는 넘어가지 않는다', async () => {
    server.use(hoursOk(), closures([]));
    await open('/store/special-closures');
    await screen.findByText('등록된 특별휴무가 없어요');
    await fireEvent.press(screen.getByRole('button', { name: '이전 달' }));
    expect(screen.getByRole('header', { name: '2026년 10월' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '다음 달' }));
    expect(screen.getByRole('header', { name: '2026년 11월' })).toBeTruthy();
  });
});

describe('일별 생산 수량', () => {
  const myStore = (isActive = true) =>
    query('SellerStoreMyStore', {
      sellerMyStore: {
        id: '3',
        storeName: '해즈 케이크',
        storePhone: '032',
        addressFull: '청라',
        addressCity: null,
        addressDistrict: null,
        addressNeighborhood: null,
        mapProvider: 'NONE',
        websiteUrl: null,
        businessHoursText: null,
        profileImageUrl: null,
        greetingMessage: null,
        pickupSlotIntervalMinutes: 30,
        minLeadTimeMinutes: 60,
        maxDaysAhead: 14,
        isActive,
      },
    });
  const data = () => {
    const capacityCalls = record('SellerStoreDailyCapacities', () => ({
      sellerStoreDailyCapacities: {
        items: [
          { id: 'c1', capacityDate: '2026-10-08T00:00:00.000Z', capacity: 6 },
          { id: 'c2', capacityDate: '2026-10-24T00:00:00.000Z', capacity: 20 },
        ],
        totalCount: 2,
      },
    }));
    const calendarCalls = record('SellerStorePickupCalendar', (vars) => ({
      pickupCalendar: {
        yearMonth: vars.yearMonth,
        days: [
          { date: '2026-10-09', selectable: false, reason: 'CLOSED' },
          { date: '2026-10-10', selectable: false, reason: 'CAPACITY_FULL' },
        ],
      },
    }));
    return { capacityCalls, calendarCalls };
  };
  const sheet = () => screen.getByRole('header', { name: /요일$/ }).parent!.parent!;

  it('칸에 수량을, 구매자 달력의 휴무·마감을 겹쳐 보인다', async () => {
    server.use(myStore());
    data();
    await open('/store/daily-capacities');
    expect(await screen.findByRole('button', { name: '10월 8일, 6' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '10월 24일, 20' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: '10월 9일, 휴무' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '10월 10일, 마감' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '10월 5일' })).toBeDisabled();
  });

  it('설정한 날을 눌러 수량을 바꾸면 그 설정을 고쳐 저장한다', async () => {
    server.use(myStore());
    data();
    const calls = record('SellerStoreUpsertDailyCapacity', () => ({
      sellerUpsertStoreDailyCapacity: { id: 'c1' },
    }));
    await open('/store/daily-capacities');
    await fireEvent.press(await screen.findByRole('button', { name: '10월 8일, 6' }));
    expect(screen.getByRole('header', { name: '10월 8일 목요일' })).toBeTruthy();
    expect(screen.getByLabelText('생산 수량')).toHaveAccessibilityValue({ now: 6 });
    await fireEvent.press(screen.getByRole('button', { name: '생산 수량 늘리기' }));
    await fireEvent.press(within(sheet()).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      input: { capacityId: 'c1', capacityDate: '2026-10-08T00:00:00.000Z', capacity: 7 },
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('생산 수량을 저장했어요'));
  });

  it('설정 없는 날은 새로 만들고, 제한 해제는 누를 수 없다', async () => {
    server.use(myStore());
    data();
    const calls = record('SellerStoreUpsertDailyCapacity', () => ({
      sellerUpsertStoreDailyCapacity: { id: 'c9' },
    }));
    await open('/store/daily-capacities');
    await fireEvent.press(await screen.findByRole('button', { name: '10월 12일' }));
    expect(screen.getByRole('button', { name: '제한 없음으로' })).toBeDisabled();
    await fireEvent.press(within(sheet()).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      input: { capacityId: null, capacityDate: '2026-10-12T00:00:00.000Z', capacity: 10 },
    });
  });

  it('제한 없음으로 누르면 그날 설정을 지운다', async () => {
    server.use(myStore());
    data();
    const calls = record('SellerStoreDeleteDailyCapacity', () => ({
      sellerDeleteStoreDailyCapacity: true,
    }));
    await open('/store/daily-capacities');
    await fireEvent.press(await screen.findByRole('button', { name: '10월 24일, 20' }));
    await fireEvent.press(screen.getByRole('button', { name: '제한 없음으로' }));
    await waitFor(() => expect(calls).toEqual([{ capacityId: 'c2' }]));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('수량 제한을 해제했어요'));
  });

  it('저장이 실패하면 범위 문구로 알린다', async () => {
    server.use(
      myStore(),
      fail(
        'SellerStoreUpsertDailyCapacity',
        'FIELD_OUT_OF_RANGE',
        'capacity은(는) 1~5000 사이여야 합니다.',
      ),
    );
    data();
    await open('/store/daily-capacities');
    await fireEvent.press(await screen.findByRole('button', { name: '10월 12일' }));
    await fireEvent.press(within(sheet()).getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('생산 수량은 1~5000개 사이로 입력해 주세요.'),
    );
  });

  it('다음 달로 넘기면 그 달 범위로 다시 조회한다', async () => {
    server.use(myStore());
    const { capacityCalls, calendarCalls } = data();
    await open('/store/daily-capacities');
    await fireEvent.press(await screen.findByRole('button', { name: '다음 달' }));
    await waitFor(() =>
      expect(capacityCalls.at(-1)).toEqual({
        input: {
          limit: 100,
          fromDate: '2026-11-01T00:00:00.000Z',
          toDate: '2026-11-30T00:00:00.000Z',
        },
      }),
    );
    await waitFor(() =>
      expect(calendarCalls.at(-1)).toEqual({ storeId: '3', yearMonth: '2026-11' }),
    );
  });

  it('비공개 매장은 구매자 달력 없이 수량만 보인다', async () => {
    server.use(myStore(false));
    const { calendarCalls } = data();
    await open('/store/daily-capacities');
    expect(await screen.findByRole('button', { name: '10월 8일, 6' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '10월 9일' })).toBeTruthy();
    expect(calendarCalls).toHaveLength(0);
  });
});
