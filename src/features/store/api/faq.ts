import { graphql } from '@/graphql/generated';
import {
  type SellerCreateFaqTopicInput,
  type SellerUpdateFaqTopicInput,
} from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

const SellerStoreCreateFaqTopicDocument = graphql(`
  mutation SellerStoreCreateFaqTopic($input: SellerCreateFaqTopicInput!) {
    sellerCreateFaqTopic(input: $input) {
      id
    }
  }
`);

export const createFaqTopic = async (input: SellerCreateFaqTopicInput) =>
  (await gqlRequest(SellerStoreCreateFaqTopicDocument, { input })).sellerCreateFaqTopic;

const SellerStoreUpdateFaqTopicDocument = graphql(`
  mutation SellerStoreUpdateFaqTopic($input: SellerUpdateFaqTopicInput!) {
    sellerUpdateFaqTopic(input: $input) {
      id
    }
  }
`);

/** 부분 수정 — 보낸 필드만 바뀐다 */
export const updateFaqTopic = async (input: SellerUpdateFaqTopicInput) =>
  (await gqlRequest(SellerStoreUpdateFaqTopicDocument, { input })).sellerUpdateFaqTopic;

const SellerStoreDeleteFaqTopicDocument = graphql(`
  mutation SellerStoreDeleteFaqTopic($topicId: ID!) {
    sellerDeleteFaqTopic(topicId: $topicId)
  }
`);

export const deleteFaqTopic = (topicId: string) =>
  gqlRequest(SellerStoreDeleteFaqTopicDocument, { topicId });
