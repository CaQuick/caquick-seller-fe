import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { graphql } from '@/graphql/generated';
import { gqlRequest } from '@/shared/api';

import { type ReviewSortKey, reviewListInput } from '../model/reviews';
import { reviewsKeys } from './queryKeys';

graphql(`
  fragment SellerReviewMediaFields on ReviewMedia {
    mediaType
    mediaUrl
    thumbnailUrl
    sortOrder
  }
`);

const SellerReviewsListDocument = graphql(`
  query SellerReviewsList($input: StoreReviewsInput!) {
    storeReviews(input: $input) {
      items {
        id
        rating
        content
        media {
          ...SellerReviewMediaFields
        }
        likeCount
        authorNickname
        productName
        createdAt
      }
      totalCount
      photoTotalCount
      hasMore
      nextCursor
    }
  }
`);

export const reviewListQueryOptions = (storeId: string, photoOnly: boolean, sort: ReviewSortKey) =>
  infiniteQueryOptions({
    queryKey: reviewsKeys.list({ storeId, photoOnly, sort }),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      (
        await gqlRequest(SellerReviewsListDocument, {
          input: reviewListInput(storeId, { photoOnly, sort }, pageParam),
        })
      ).storeReviews,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });

const SellerReviewsDetailDocument = graphql(`
  query SellerReviewsDetail($reviewId: ID!) {
    reviewDetail(reviewId: $reviewId) {
      review {
        id
        rating
        content
        media {
          ...SellerReviewMediaFields
        }
        likeCount
        commentCount
        authorNickname
        customOptions {
          groupName
          optionTitle
        }
        createdAt
      }
      product {
        productId
        name
        thumbnailUrl
        regularPrice
        salePrice
      }
    }
  }
`);

export const reviewDetailQueryOptions = (reviewId: string) =>
  queryOptions({
    queryKey: reviewsKeys.detail(reviewId),
    queryFn: async () => (await gqlRequest(SellerReviewsDetailDocument, { reviewId })).reviewDetail,
  });

const SellerReviewsCommentsDocument = graphql(`
  query SellerReviewsComments($input: ReviewCommentsInput!) {
    reviewComments(input: $input) {
      items {
        id
        content
        authorNickname
        createdAt
      }
      totalCount
      hasMore
      nextCursor
    }
  }
`);

/** 등록순 커서 목록(읽기 전용) */
export const reviewCommentsQueryOptions = (reviewId: string) =>
  infiniteQueryOptions({
    queryKey: reviewsKeys.comments(reviewId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      (
        await gqlRequest(SellerReviewsCommentsDocument, {
          input: { reviewId, cursor: pageParam, limit: 20 },
        })
      ).reviewComments,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });
