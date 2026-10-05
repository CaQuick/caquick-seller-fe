import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { HttpResponse, graphql } from 'msw';
import { toast } from 'sonner-native';

import { type SellerStoreMyStoreQuery } from '@/graphql/generated/graphql';
import { mockFileSizes } from '@/test/mocks';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { StoreBasicInfoScreen } from './basic-info-screen';
import { StorePickupPolicyScreen } from './pickup-policy-screen';
import { StoreMenuScreen } from './store-menu-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));
jest.mock('sonner-native', () => ({
  Toaster: () => null,
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: jest.fn(),
      renderAsync: () =>
        Promise.resolve({ saveAsync: () => Promise.resolve({ uri: 'file:///cache/logo.jpg' }) }),
    }),
  },
}));

type Store = SellerStoreMyStoreQuery['sellerMyStore'];
const STORE: Store = {
  id: '3',
  storeName: '해즈 케이크',
  storePhone: '032-123-4567',
  addressFull: '청라커낼로 252 1층',
  addressCity: '인천',
  addressDistrict: '서구',
  addressNeighborhood: '청라동',
  mapProvider: 'NAVER',
  websiteUrl: 'instagram.com/hazcake',
  businessHoursText: null,
  greetingMessage: null,
  profileImageUrl: null,
  pickupSlotIntervalMinutes: 30,
  minLeadTimeMinutes: 1440,
  maxDaysAhead: 14,
  isActive: true,
};

const query = (operation: string, data: object) =>
  graphql.query(operation, () => HttpResponse.json({ data }));
const myStore = (patch: Partial<Store> = {}) =>
  query('SellerStoreMyStore', { sellerMyStore: { ...STORE, ...patch } });
const fail = (
  operation: string,
  code: string,
  message: string,
  classification = 'BAD_USER_INPUT',
) =>
  graphql.operation(({ operationName }) =>
    operationName === operation
      ? HttpResponse.json({
          data: null,
          errors: [graphqlError({ message, code, classification, statusCode: 400 })],
        })
      : undefined,
  );
/** 변수를 기록하고 data를 돌려준다 */
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

const routes = {
  store: StoreMenuScreen,
  'store/basic-info': StoreBasicInfoScreen,
  'store/pickup-policy': StorePickupPolicyScreen,
  'store/business-hours': () => null,
  'store/preview': () => null,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl, wrapper: Providers });

// 오늘은 2026-10-06(화) KST — Date만 고정하고 타이머는 실제로 둔다
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

describe('매장 탭', () => {
  const hubData = () => {
    const ratingCalls = record('SellerStoreRating', () => ({
      storeDetail: { id: '3', ratingAverage: 4.8, reviewCount: 128 },
    }));
    server.use(
      query('SellerStoreBusinessHours', {
        sellerStoreBusinessHours: [
          ...[1, 2, 3, 4, 5].map((d) => ({
            id: `h${d}`,
            dayOfWeek: d,
            isClosed: false,
            openTime: '1970-01-01T10:00:00.000Z',
            closeTime: '1970-01-01T19:00:00.000Z',
          })),
          {
            id: 'h6',
            dayOfWeek: 6,
            isClosed: false,
            openTime: '1970-01-01T10:00:00.000Z',
            closeTime: '1970-01-01T17:00:00.000Z',
          },
        ],
      }),
      query('SellerStoreSpecialClosures', {
        sellerStoreSpecialClosures: {
          items: [
            { id: 'c1', closureDate: '2026-10-23T00:00:00.000Z', reason: '재료 수급' },
            { id: 'c2', closureDate: '2026-10-01T00:00:00.000Z', reason: null },
            { id: 'c3', closureDate: '2026-10-09T00:00:00.000Z', reason: '한글날' },
          ],
          totalCount: 3,
          hasMore: false,
          nextCursor: null,
        },
      }),
      query('SellerStoreFaqTopics', {
        sellerFaqTopics: [true, true, true, false].map((isActive, i) => ({
          id: `f${i}`,
          storeId: '3',
          title: `질문 ${i}`,
          answerHtml: '<p>답</p>',
          sortOrder: i,
          isActive,
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        })),
      }),
    );
    const capacityCalls = record('SellerStoreDailyCapacities', () => ({
      sellerStoreDailyCapacities: { items: [], totalCount: 4 },
    }));
    return { ratingCalls, capacityCalls };
  };

  it('프로필 카드와 메뉴 보조 문구를 실제 값으로 채운다', async () => {
    server.use(myStore());
    const { capacityCalls } = hubData();
    await open('/store');
    expect(await screen.findByText('해즈 케이크')).toBeTruthy();
    expect(screen.getByText('인천 서구 청라동')).toBeTruthy();
    expect(await screen.findByText('리뷰 128')).toBeTruthy();
    expect(screen.getByLabelText('별점 5점 중 4.8점')).toBeTruthy();
    for (const name of [
      '영업시간, 월–금 10:00–19:00 · 토 10:00–17:00 · 일 휴무',
      '특별휴무, 10월 9일 외 1건',
      '픽업 정책, 30분 간격 · 하루 전 마감 · 14일 전까지',
      '일별 생산 수량, 이번 달 조정 4일',
      '자동응답(FAQ), 활성 3개 · 전체 4',
      '리뷰, ★ 4.8 · 128개',
    ]) {
      expect(await screen.findByRole('button', { name })).toBeTruthy();
    }
    expect(capacityCalls[0]).toEqual({
      input: {
        limit: 100,
        fromDate: '2026-10-01T00:00:00.000Z',
        toDate: '2026-10-31T00:00:00.000Z',
      },
    });
  });

  it('구매자 화면 보기와 메뉴 행이 해당 화면으로 보낸다', async () => {
    server.use(myStore());
    hubData();
    const router = open('/store');
    await router;
    await fireEvent.press(await screen.findByRole('link', { name: '구매자 화면 보기' }));
    await waitFor(() => expect(router.getPathname()).toBe('/store/preview'));
  });

  it('메뉴 행을 누르면 그 설정 화면으로 간다', async () => {
    server.use(myStore());
    hubData();
    const router = open('/store');
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: /^영업시간/ }));
    await waitFor(() => expect(router.getPathname()).toBe('/store/business-hours'));
  });

  it('비공개 매장은 평점을 부르지 않고 비공개라고 적는다', async () => {
    server.use(myStore({ isActive: false }));
    const { ratingCalls } = hubData();
    await open('/store');
    expect(await screen.findByText('비공개 매장')).toBeTruthy();
    expect(screen.getByRole('button', { name: '리뷰, 구매자 리뷰' })).toBeTruthy();
    expect(ratingCalls).toHaveLength(0);
  });

  it('매장 정보를 못 받으면 다시 시도를 보여 준다', async () => {
    server.use(fail('SellerStoreMyStore', 'STORE_NOT_FOUND', 'x', 'NOT_FOUND'));
    hubData();
    await open('/store');
    expect(await screen.findByText('매장 정보를 찾을 수 없습니다.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  });
});

describe('기본 정보', () => {
  const regionData = () =>
    server.use(
      query('SellerStoreRegionGroups', {
        regionGroups: [
          { id: 'g0', name: '전국', hasChildren: false },
          { id: 'g1', name: '서울 남부', hasChildren: true },
        ],
      }),
      query('SellerStoreRegions', { regions: [{ id: 'r1', name: '강남구' }] }),
      query('SellerStoreSearchRegions', {
        searchRegions: [
          { id: 'g1', name: '서울 남부', parentName: null, level: 1 },
          { id: 'r9', name: '서구', parentName: '인천', level: 2 },
        ],
      }),
    );
  const saveButton = () => screen.getByRole('button', { name: '저장' });

  it('바꾼 필드만 보내고 저장 뒤 폼이 새 값으로 돌아간다', async () => {
    server.use(myStore());
    regionData();
    const calls = record('SellerStoreUpdateBasicInfo', (vars) => ({
      sellerUpdateStoreBasicInfo: { ...STORE, ...(vars.input as object) },
    }));
    await open('/store/basic-info');
    expect(await screen.findByDisplayValue('해즈 케이크')).toBeTruthy();
    expect(saveButton()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('매장명'), '해즈 케이크 청라점');
    await fireEvent.changeText(screen.getByLabelText('인사말'), '  ');
    await fireEvent.press(screen.getByRole('tab', { name: '없음' }));
    await fireEvent.press(saveButton());
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      input: { storeName: '해즈 케이크 청라점', mapProvider: 'NONE' },
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('저장되었습니다'));
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });

  it('필수값을 비우면 서버를 부르지 않고 필드 아래에 알린다', async () => {
    server.use(myStore());
    regionData();
    const calls = record('SellerStoreUpdateBasicInfo', () => ({}));
    await open('/store/basic-info');
    await fireEvent.changeText(await screen.findByLabelText('매장명'), ' ');
    await fireEvent.press(saveButton());
    expect(await screen.findByText('매장명을 입력해 주세요.')).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it('BAD_USER_INPUT은 폼 위 알림으로 보여 준다', async () => {
    server.use(
      myStore(),
      fail('SellerStoreUpdateBasicInfo', 'TEXT_TOO_LONG', '텍스트는 30자 이하여야 합니다.'),
    );
    regionData();
    await open('/store/basic-info');
    await fireEvent.changeText(await screen.findByLabelText('전화번호'), '010-0000-0000');
    await fireEvent.press(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('입력한 내용이 너무 깁니다.');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('광역 → 시군구로 지역을 고르면 주소 단위를 바꾸고 이전 동을 비운다', async () => {
    server.use(myStore());
    regionData();
    const calls = record('SellerStoreUpdateBasicInfo', () => ({
      sellerUpdateStoreBasicInfo: STORE,
    }));
    await open('/store/basic-info');
    const group = await screen.findByRole('button', { name: '서울 남부' });
    // 하위 지역이 없는 광역(전국)은 고를 것이 없어 숨긴다
    expect(screen.queryByRole('button', { name: '전국' })).toBeNull();
    await fireEvent.press(group);
    await fireEvent.press(await screen.findByRole('button', { name: '강남구, 서울 남부' }));
    expect(screen.getByRole('button', { name: '주소' })).toHaveAccessibilityValue({
      text: '서울 남부 강남구',
    });
    await fireEvent.press(saveButton());
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      input: { addressCity: '서울 남부', addressDistrict: '강남구', addressNeighborhood: null },
    });
  });

  it('검색 결과에서 시군구를 고르고, 광역을 누르면 그 아래 목록으로 간다', async () => {
    server.use(myStore());
    regionData();
    await open('/store/basic-info');
    await fireEvent.changeText(await screen.findByLabelText('지역 이름으로 검색'), '서');
    await fireEvent.press(await screen.findByRole('button', { name: '서울 남부, 광역 지역' }));
    expect(await screen.findByRole('button', { name: '광역 지역 목록으로' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '광역 지역 목록으로' }));
    await fireEvent.changeText(screen.getByLabelText('지역 이름으로 검색'), '서구');
    await fireEvent.press(await screen.findByRole('button', { name: '서구, 인천' }));
    expect(screen.getByRole('button', { name: '주소' })).toHaveAccessibilityValue({
      text: '인천 서구',
    });
  });

  it('로고를 고르면 STORE_IMAGE로 올리고 저장 때 publicUrl을 보낸다', async () => {
    mockFileSizes.set('file:///cache/logo.jpg', 1234);
    jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', width: 800, height: 800 }],
    } as never);
    server.use(myStore());
    regionData();
    const presign = record('SellerStoreCreateUploadUrl', () => ({
      sellerCreateUploadUrl: {
        uploadUrl: 'https://s3.test/put',
        publicUrl: 'https://cdn.test/l.jpg',
      },
    }));
    const calls = record('SellerStoreUpdateBasicInfo', () => ({
      sellerUpdateStoreBasicInfo: { ...STORE, profileImageUrl: 'https://cdn.test/l.jpg' },
    }));
    await open('/store/basic-info');
    await fireEvent.press(await screen.findByRole('button', { name: '로고 변경' }));
    expect(await screen.findByLabelText('매장 로고')).toBeTruthy();
    expect(presign[0]).toEqual({
      input: { purpose: 'STORE_IMAGE', contentType: 'image/jpeg', contentLength: 1234 },
    });
    await fireEvent.press(saveButton());
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ input: { profileImageUrl: 'https://cdn.test/l.jpg' } });
  });

  it('로고 업로드가 실패하면 토스트로 알리고 로고를 바꾸지 않는다', async () => {
    mockFileSizes.set('file:///cache/logo.jpg', 1234);
    jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', width: 800, height: 800 }],
    } as never);
    server.use(
      myStore(),
      fail('SellerStoreCreateUploadUrl', 'INVALID_CONTENT_LENGTH', '파일이 너무 큽니다.'),
    );
    regionData();
    await open('/store/basic-info');
    await fireEvent.press(await screen.findByRole('button', { name: '로고 변경' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('파일이 너무 큽니다.'));
    expect(screen.queryByLabelText('매장 로고')).toBeNull();
    expect(saveButton()).toBeDisabled();
  });
});

describe('픽업 정책', () => {
  const day = (date: string, reason: string | null) => ({
    date,
    selectable: reason === null,
    reason,
  });
  const previewData = () => {
    const calendarCalls = record('SellerStorePickupCalendar', () => ({
      pickupCalendar: {
        yearMonth: '2026-10',
        days: [
          day('2026-10-05', 'PAST'),
          day('2026-10-06', 'CAPACITY_FULL'),
          day('2026-10-07', 'CLOSED'),
          day('2026-10-08', null),
          day('2026-10-12', null),
          day('2026-10-21', 'OUT_OF_RANGE'),
        ],
      },
    }));
    const slotCalls = record('SellerStorePickupTimeSlots', (vars) => ({
      pickupTimeSlots: {
        date: vars.date,
        morning: [
          { time: '10:00', available: false },
          { time: '11:00', available: true },
        ],
        afternoon: [{ time: '13:00', available: true }],
      },
    }));
    return { calendarCalls, slotCalls };
  };

  it('저장된 정책으로 구매자 달력과 첫 예약 가능일의 슬롯을 그린다', async () => {
    server.use(myStore());
    const { calendarCalls, slotCalls } = previewData();
    await open('/store/pickup-policy');
    expect(await screen.findByText('1440분 = 하루 전 마감')).toBeTruthy();
    expect(await screen.findByRole('button', { name: '10월 6일, 마감' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '10월 7일, 휴무' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '10월 21일' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '10월 8일' })).toBeSelected();
    expect(await screen.findByText('30분 간격 · 3칸')).toBeTruthy();
    expect(screen.getByRole('button', { name: '10:00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '13:00' })).not.toBeDisabled();
    expect(calendarCalls[0]).toEqual({ storeId: '3', yearMonth: '2026-10' });
    expect(slotCalls[0]).toEqual({ storeId: '3', date: '2026-10-08' });

    await fireEvent.press(screen.getByRole('button', { name: '10월 12일' }));
    await waitFor(() => expect(slotCalls.at(-1)).toEqual({ storeId: '3', date: '2026-10-12' }));
    // 반증: 휴무 날은 눌러도 고르지 않는다
    await fireEvent.press(screen.getByRole('button', { name: '10월 7일, 휴무' }));
    expect(screen.getByRole('button', { name: '10월 12일' })).toBeSelected();
  });

  it('세 값을 바꿔 저장한다 — 슬롯 간격은 정해진 단계로 움직인다', async () => {
    server.use(myStore());
    previewData();
    const calls = record('SellerStoreUpdatePickupPolicy', (vars) => ({
      sellerUpdatePickupPolicy: { ...STORE, ...(vars.input as object) },
    }));
    await open('/store/pickup-policy');
    const save = await screen.findByRole('button', { name: '저장' });
    expect(save).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: '슬롯 간격 늘리기' }));
    expect(screen.getByLabelText('슬롯 간격')).toHaveAccessibilityValue({ now: 60 });
    await fireEvent.changeText(screen.getByLabelText('최소 리드타임(분)'), '120');
    await fireEvent.press(screen.getByRole('button', { name: '예약 가능 일수 늘리기' }));
    await fireEvent.press(save);
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      input: { pickupSlotIntervalMinutes: 60, minLeadTimeMinutes: 120, maxDaysAhead: 15 },
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('저장되었습니다'));
  });

  it('리드타임이 숫자가 아니거나 7일을 넘으면 저장을 막는다', async () => {
    server.use(myStore());
    previewData();
    await open('/store/pickup-policy');
    const lead = await screen.findByLabelText('최소 리드타임(분)');
    await fireEvent.changeText(lead, '10081');
    expect(screen.getByText('최소 리드타임은 0~10080분 사이로 입력해 주세요.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    await fireEvent.changeText(lead, '1.5');
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  it('서버 범위 오류는 영문 필드명 대신 화면 이름으로 폼 위에 알린다', async () => {
    server.use(
      myStore(),
      fail(
        'SellerStoreUpdatePickupPolicy',
        'FIELD_OUT_OF_RANGE',
        'minLeadTimeMinutes은(는) 0~10080 사이여야 합니다.',
      ),
    );
    previewData();
    await open('/store/pickup-policy');
    await fireEvent.changeText(await screen.findByLabelText('최소 리드타임(분)'), '60');
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '최소 리드타임은 0~10080분 사이로 입력해 주세요.',
    );
  });

  it('비공개 매장은 구매자 달력을 부르지 않고 안내만 한다', async () => {
    server.use(myStore({ isActive: false }));
    const { calendarCalls } = previewData();
    await open('/store/pickup-policy');
    expect(
      await screen.findByText('매장이 비공개 상태라 구매자 달력을 미리 볼 수 없어요'),
    ).toBeTruthy();
    expect(calendarCalls).toHaveLength(0);
  });

  it('구매자 달력이 NOT_FOUND면 같은 안내를 한다', async () => {
    server.use(
      myStore(),
      fail('SellerStorePickupCalendar', 'STORE_NOT_FOUND', '매장을 찾을 수 없습니다.', 'NOT_FOUND'),
    );
    await open('/store/pickup-policy');
    expect(
      await screen.findByText('매장이 비공개 상태라 구매자 달력을 미리 볼 수 없어요'),
    ).toBeTruthy();
  });

  it('다음 달로 넘기면 그 달 달력을 부른다', async () => {
    server.use(myStore());
    const { calendarCalls } = previewData();
    await open('/store/pickup-policy');
    await fireEvent.press(await screen.findByRole('button', { name: '다음 달' }));
    await waitFor(() =>
      expect(calendarCalls.at(-1)).toEqual({ storeId: '3', yearMonth: '2026-11' }),
    );
    await act(() => Promise.resolve());
  });
});
