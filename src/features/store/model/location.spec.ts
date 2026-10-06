import {
  Accuracy,
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
} from 'expo-location';
import { HttpResponse, graphql } from 'msw';

import { ApiError } from '@/shared/api';
import { server } from '@/test/msw/server';

import {
  LOCATE_TIMEOUT_MS,
  LOCATION_COPY,
  LocateTimeoutError,
  locateErrorMessage,
  locateRegion,
} from './location';

const requestPermission = jest.mocked(requestForegroundPermissionsAsync);
const currentPosition = jest.mocked(getCurrentPositionAsync);

afterEach(() => jest.clearAllMocks());

describe('locateRegion', () => {
  it('권한을 거부하면 위치를 읽지 않고 denied를 돌려준다', async () => {
    requestPermission.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
    } as Awaited<ReturnType<typeof requestForegroundPermissionsAsync>>);
    await expect(locateRegion()).resolves.toEqual({ status: 'denied' });
    expect(currentPosition).not.toHaveBeenCalled();
  });

  it('허용하면 Balanced 정확도의 좌표로 지역을 찾아 광역·시군구 이름을 돌려준다', async () => {
    const calls: unknown[] = [];
    server.use(
      graphql.query('SellerStoreRegionByLocation', ({ variables }) => {
        calls.push(variables.input);
        return HttpResponse.json({
          data: {
            regionByLocation: {
              group: { id: 'g2', name: '인천' },
              region: { id: 'r9', name: '서구' },
            },
          },
        });
      }),
    );
    await expect(locateRegion()).resolves.toEqual({
      status: 'found',
      pick: { name: '서구', parentName: '인천' },
    });
    expect(currentPosition).toHaveBeenCalledWith({ accuracy: Accuracy.Balanced });
    expect(calls).toEqual([{ latitude: 37.5326, longitude: 126.6406 }]);
  });

  it('매칭되는 지역이 없으면 notFound를 돌려준다', async () => {
    server.use(
      graphql.query('SellerStoreRegionByLocation', () =>
        HttpResponse.json({ data: { regionByLocation: null } }),
      ),
    );
    await expect(locateRegion()).resolves.toEqual({ status: 'notFound' });
  });

  describe('위치 타임아웃', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('10초 안에 위치가 오지 않으면 지역 조회 없이 실패한다', async () => {
      currentPosition.mockReturnValueOnce(new Promise(() => undefined));
      let outcome: unknown = 'pending';
      void locateRegion().then(
        (v) => (outcome = v),
        (e: unknown) => (outcome = e),
      );
      await jest.advanceTimersByTimeAsync(LOCATE_TIMEOUT_MS - 1);
      expect(outcome).toBe('pending');
      await jest.advanceTimersByTimeAsync(1);
      expect(outcome).toBeInstanceOf(LocateTimeoutError);
    });

    it('위치 읽기가 끝나면 타이머를 남기지 않는다', async () => {
      currentPosition.mockRejectedValueOnce(new Error('Location services are disabled'));
      await expect(locateRegion()).rejects.toThrow('Location services are disabled');
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});

describe('locateErrorMessage', () => {
  it.each([
    ['기기 위치 실패', new LocateTimeoutError(), LOCATION_COPY.positionFailed],
    ['위치 서비스 꺼짐', new Error('Location services are disabled'), LOCATION_COPY.positionFailed],
    [
      'RATE_LIMITED',
      new ApiError('요청이 너무 많습니다.', 'TOO_MANY_REQUESTS', 'RATE_LIMITED', 429),
      '요청이 많아요. 잠시 뒤 다시 시도해 주세요',
    ],
    [
      'LOCATION_LOOKUP_UNAVAILABLE',
      new ApiError('x', 'INTERNAL_SERVER_ERROR', 'LOCATION_LOOKUP_UNAVAILABLE', 503),
      '지금은 현재 위치로 지역을 찾을 수 없어요. 검색으로 선택해 주세요',
    ],
    [
      '그 밖의 코드는 매장 공통 문구',
      new ApiError('x', 'INTERNAL_SERVER_ERROR', 'INTERNAL_ERROR', 500),
      '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    ],
  ])('%s', (_, error, message) => {
    expect(locateErrorMessage(error)).toBe(message);
  });
});
