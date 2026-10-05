import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import {
  type SellerUpsertStoreBusinessHourInput,
  type SellerUpsertStoreDailyCapacityInput,
  type SellerUpsertStoreSpecialClosureInput,
} from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

import { storeKeys } from './queryKeys';

const SellerStoreBusinessHoursDocument = graphql(`
  query SellerStoreBusinessHours {
    sellerStoreBusinessHours {
      id
      dayOfWeek
      isClosed
      openTime
      closeTime
    }
  }
`);

export const businessHoursQueryOptions = () =>
  queryOptions({
    queryKey: storeKeys.businessHours(),
    queryFn: async () =>
      (await gqlRequest(SellerStoreBusinessHoursDocument)).sellerStoreBusinessHours,
  });

const SellerStoreUpsertBusinessHourDocument = graphql(`
  mutation SellerStoreUpsertBusinessHour($input: SellerUpsertStoreBusinessHourInput!) {
    sellerUpsertStoreBusinessHour(input: $input) {
      id
    }
  }
`);

export const upsertBusinessHour = (input: SellerUpsertStoreBusinessHourInput) =>
  gqlRequest(SellerStoreUpsertBusinessHourDocument, { input });

const SellerStoreSpecialClosuresDocument = graphql(`
  query SellerStoreSpecialClosures($input: CursorInput) {
    sellerStoreSpecialClosures(input: $input) {
      items {
        id
        closureDate
        reason
      }
      totalCount
      hasMore
      nextCursor
    }
  }
`);

/** 최신 등록순 커서 목록 — 화면이 날짜순으로 다시 정렬한다 */
export const specialClosuresQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: storeKeys.specialClosures(),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      (
        await gqlRequest(SellerStoreSpecialClosuresDocument, {
          input: { limit: 100, cursor: pageParam },
        })
      ).sellerStoreSpecialClosures,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });

const SellerStoreUpsertSpecialClosureDocument = graphql(`
  mutation SellerStoreUpsertSpecialClosure($input: SellerUpsertStoreSpecialClosureInput!) {
    sellerUpsertStoreSpecialClosure(input: $input) {
      id
    }
  }
`);

export const upsertSpecialClosure = (input: SellerUpsertStoreSpecialClosureInput) =>
  gqlRequest(SellerStoreUpsertSpecialClosureDocument, { input });

const SellerStoreDeleteSpecialClosureDocument = graphql(`
  mutation SellerStoreDeleteSpecialClosure($closureId: ID!) {
    sellerDeleteStoreSpecialClosure(closureId: $closureId)
  }
`);

export const deleteSpecialClosure = (closureId: string) =>
  gqlRequest(SellerStoreDeleteSpecialClosureDocument, { closureId });

const SellerStoreDailyCapacitiesDocument = graphql(`
  query SellerStoreDailyCapacities($input: SellerDateCursorInput) {
    sellerStoreDailyCapacities(input: $input) {
      items {
        id
        capacityDate
        capacity
      }
      totalCount
    }
  }
`);

/** 한 달은 31건 이하라 상한 100 한 페이지로 끝난다 */
export const dailyCapacitiesQueryOptions = (
  month: string,
  range: { fromDate: string; toDate: string },
) =>
  queryOptions({
    queryKey: storeKeys.dailyCapacities(month),
    queryFn: async () =>
      (
        await gqlRequest(SellerStoreDailyCapacitiesDocument, {
          input: { limit: 100, ...range },
        })
      ).sellerStoreDailyCapacities,
  });

const SellerStoreUpsertDailyCapacityDocument = graphql(`
  mutation SellerStoreUpsertDailyCapacity($input: SellerUpsertStoreDailyCapacityInput!) {
    sellerUpsertStoreDailyCapacity(input: $input) {
      id
    }
  }
`);

export const upsertDailyCapacity = (input: SellerUpsertStoreDailyCapacityInput) =>
  gqlRequest(SellerStoreUpsertDailyCapacityDocument, { input });

const SellerStoreDeleteDailyCapacityDocument = graphql(`
  mutation SellerStoreDeleteDailyCapacity($capacityId: ID!) {
    sellerDeleteStoreDailyCapacity(capacityId: $capacityId)
  }
`);

export const deleteDailyCapacity = (capacityId: string) =>
  gqlRequest(SellerStoreDeleteDailyCapacityDocument, { capacityId });

const SellerStorePickupCalendarDocument = graphql(`
  query SellerStorePickupCalendar($storeId: ID!, $yearMonth: String!) {
    pickupCalendar(storeId: $storeId, yearMonth: $yearMonth) {
      yearMonth
      days {
        date
        selectable
        reason
      }
    }
  }
`);

/** 구매자가 보는 달력 그대로 — 비공개 매장은 NOT_FOUND */
export const pickupCalendarQueryOptions = (storeId: string, yearMonth: string) =>
  queryOptions({
    queryKey: storeKeys.pickupCalendar(storeId, yearMonth),
    queryFn: async () =>
      (await gqlRequest(SellerStorePickupCalendarDocument, { storeId, yearMonth })).pickupCalendar,
  });

const SellerStorePickupTimeSlotsDocument = graphql(`
  query SellerStorePickupTimeSlots($storeId: ID!, $date: String!) {
    pickupTimeSlots(storeId: $storeId, date: $date) {
      date
      morning {
        time
        available
      }
      afternoon {
        time
        available
      }
    }
  }
`);

export const pickupSlotsQueryOptions = (storeId: string, date: string) =>
  queryOptions({
    queryKey: storeKeys.pickupSlots(storeId, date),
    queryFn: async () =>
      (await gqlRequest(SellerStorePickupTimeSlotsDocument, { storeId, date })).pickupTimeSlots,
  });
