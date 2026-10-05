import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { getCurrentPositionAsync, requestForegroundPermissionsAsync } from 'expo-location';
import { HttpResponse, graphql } from 'msw';
import { createRef } from 'react';
import { Linking } from 'react-native';

import { gqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { LOCATION_COPY } from '../model/location';
import { RegionSheet } from './region-sheet';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));

type Permission = Awaited<ReturnType<typeof requestForegroundPermissionsAsync>>;
type Position = Awaited<ReturnType<typeof getCurrentPositionAsync>>;

const lookup = (regionByLocation: object | null) =>
  graphql.query('SellerStoreRegionByLocation', () =>
    HttpResponse.json({ data: { regionByLocation } }),
  );
const FOUND = { group: { id: 'g2', name: '인천' }, region: { id: 'r9', name: '서구' } };

async function openSheet(queryClient = createTestQueryClient()) {
  // 뮤테이션 gc 타이머(기본 5분)가 jest 종료를 붙잡지 않게
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    mutations: { retry: false, gcTime: 0 },
  });
  server.use(
    graphql.query('SellerStoreRegionGroups', () =>
      HttpResponse.json({ data: { regionGroups: [] } }),
    ),
  );
  const onPick = jest.fn();
  const ref = createRef<BottomSheetModal>();
  await renderWithProviders(<RegionSheet ref={ref} onPick={onPick} />, { queryClient });
  // 목의 dismiss는 onDismiss를 부르지 않는다 — 실제 시트처럼 닫힘을 알린다
  const sheet = ref.current as unknown as { props: { onDismiss: () => void }; dismiss: () => void };
  const dismiss = jest.spyOn(sheet, 'dismiss').mockImplementation(() => sheet.props.onDismiss());
  return { onPick, dismiss, close: () => sheet.dismiss() };
}
const findButton = () => screen.getByRole('button', { name: LOCATION_COPY.find });

afterEach(() => jest.clearAllMocks());

describe('지역 시트 — 현재 위치로 찾기', () => {
  it('찾은 광역·시군구를 지역 선택과 같은 모양으로 넘기고 시트를 닫는다', async () => {
    server.use(lookup(FOUND));
    const { onPick, dismiss } = await openSheet();
    await fireEvent.press(findButton());
    await waitFor(() => expect(onPick).toHaveBeenCalledWith({ name: '서구', parentName: '인천' }));
    expect(dismiss).toHaveBeenCalled();
  });

  it('권한을 거부하면 위치를 읽지 않고 설정 열기를 안내한다', async () => {
    jest
      .mocked(requestForegroundPermissionsAsync)
      .mockResolvedValueOnce({ status: 'denied', granted: false } as Permission);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValueOnce();
    const { onPick } = await openSheet();
    await fireEvent.press(findButton());
    expect(await screen.findByText(LOCATION_COPY.denied)).toBeTruthy();
    expect(getCurrentPositionAsync).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: LOCATION_COPY.openSettings }));
    expect(openSettings).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('매칭되는 지역이 없으면 검색을 권하고 시트를 그대로 둔다', async () => {
    server.use(lookup(null));
    const { onPick } = await openSheet();
    await fireEvent.press(findButton());
    expect(await screen.findByText(LOCATION_COPY.notFound)).toBeTruthy();
    expect(onPick).not.toHaveBeenCalled();
  });

  it.each([
    ['RATE_LIMITED', 'TOO_MANY_REQUESTS', 429, '요청이 많아요. 잠시 뒤 다시 시도해 주세요'],
    [
      'LOCATION_LOOKUP_UNAVAILABLE',
      'INTERNAL_SERVER_ERROR',
      503,
      '지금은 현재 위치로 지역을 찾을 수 없어요. 검색으로 선택해 주세요',
    ],
  ])('%s면 그 문구를 알림으로 보여 준다', async (code, classification, statusCode, message) => {
    server.use(
      gqlError('SellerStoreRegionByLocation', {
        message: 'x',
        code,
        classification,
        statusCode,
      }),
    );
    await openSheet();
    await fireEvent.press(findButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('위치를 읽는 동안 버튼을 막고, 그 사이 시트를 닫으면 늦게 온 결과를 적용하지 않는다', async () => {
    server.use(lookup(FOUND));
    let resolvePosition: (p: Position) => void = () => undefined;
    jest.mocked(getCurrentPositionAsync).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePosition = resolve;
      }),
    );
    const queryClient = createTestQueryClient();
    const { onPick, close } = await openSheet(queryClient);
    await fireEvent.press(findButton());
    await waitFor(() => expect(findButton()).toBeDisabled());
    await act(close);
    expect(findButton()).toBeEnabled();
    await act(() =>
      resolvePosition({ coords: { latitude: 37.5, longitude: 126.6 }, timestamp: 0 } as Position),
    );
    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    expect(onPick).not.toHaveBeenCalled();
  });
});
