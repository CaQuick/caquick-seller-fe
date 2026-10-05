import { queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { gqlRequest } from '@/shared/api';

import { storeKeys } from './queryKeys';

const SellerStoreRegionGroupsDocument = graphql(`
  query SellerStoreRegionGroups {
    regionGroups {
      id
      name
      hasChildren
    }
  }
`);

export const regionGroupsQueryOptions = () =>
  queryOptions({
    queryKey: storeKeys.regionGroups(),
    queryFn: async () => (await gqlRequest(SellerStoreRegionGroupsDocument)).regionGroups,
    staleTime: Infinity,
  });

const SellerStoreRegionsDocument = graphql(`
  query SellerStoreRegions($parentId: ID!) {
    regions(parentId: $parentId) {
      id
      name
    }
  }
`);

export const regionsQueryOptions = (parentId: string) =>
  queryOptions({
    queryKey: storeKeys.regions(parentId),
    queryFn: async () => (await gqlRequest(SellerStoreRegionsDocument, { parentId })).regions,
    staleTime: Infinity,
  });

const SellerStoreSearchRegionsDocument = graphql(`
  query SellerStoreSearchRegions($input: SearchRegionsInput!) {
    searchRegions(input: $input) {
      id
      name
      parentName
      level
    }
  }
`);

export const searchRegionsQueryOptions = (keyword: string) =>
  queryOptions({
    queryKey: storeKeys.regionSearch(keyword),
    queryFn: async () =>
      (await gqlRequest(SellerStoreSearchRegionsDocument, { input: { keyword, limit: 20 } }))
        .searchRegions,
  });

const SellerStoreRegionByLocationDocument = graphql(`
  query SellerStoreRegionByLocation($input: RegionByLocationInput!) {
    regionByLocation(input: $input) {
      group {
        id
        name
      }
      region {
        id
        name
      }
    }
  }
`);

/** 좌표가 캐시 키에 남지 않게 queryOptions 없이 한 번만 부른다 */
export async function fetchRegionByLocation(latitude: number, longitude: number) {
  const data = await gqlRequest(SellerStoreRegionByLocationDocument, {
    input: { latitude, longitude },
  });
  return data.regionByLocation ?? null;
}
