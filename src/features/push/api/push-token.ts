import { graphql } from '@/graphql/generated';
import { type PushPlatform } from '@/graphql/generated/graphql';
import { gqlRequest } from '@/shared/api';

const SellerPushRegisterTokenDocument = graphql(`
  mutation SellerPushRegisterToken($input: SellerRegisterPushTokenInput!) {
    sellerRegisterPushToken(input: $input)
  }
`);

const SellerPushUnregisterTokenDocument = graphql(`
  mutation SellerPushUnregisterToken($input: SellerUnregisterPushTokenInput!) {
    sellerUnregisterPushToken(input: $input)
  }
`);

/** BE는 토큰 기준 upsert라 같은 토큰을 몇 번 보내도 결과가 같다 */
export const registerPushToken = async (token: string, platform: PushPlatform) =>
  (await gqlRequest(SellerPushRegisterTokenDocument, { input: { token, platform } }))
    .sellerRegisterPushToken;

export const unregisterPushToken = async (token: string) =>
  (await gqlRequest(SellerPushUnregisterTokenDocument, { input: { token } }))
    .sellerUnregisterPushToken;
