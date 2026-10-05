/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** 계정 상태. ACTIVE가 아니면 로그인·API 접근이 거부된다. */
export type AccountStatus =
  /** 정상. */
  | 'ACTIVE'
  /** 가입 대기. 현재 생성 경로가 없는 예약값이다. */
  | 'PENDING'
  /** 운영자가 정지한 상태. 모든 API 접근이 FORBIDDEN이고 refresh 세션도 폐기된다. */
  | 'SUSPENDED';

export type SellerAuthMeQueryVariables = Exact<{ [key: string]: never; }>;


export type SellerAuthMeQuery = { sellerMe: { accountId: string, username: string | null, displayName: string | null, storeId: string | null, mustChangePassword: boolean, accountStatus: AccountStatus } };

export type PingQueryVariables = Exact<{ [key: string]: never; }>;


export type PingQuery = { ping: string };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const SellerAuthMeDocument = new TypedDocumentString(`
    query SellerAuthMe {
  sellerMe {
    accountId
    username
    displayName
    storeId
    mustChangePassword
    accountStatus
  }
}
    `) as unknown as TypedDocumentString<SellerAuthMeQuery, SellerAuthMeQueryVariables>;
export const PingDocument = new TypedDocumentString(`
    query Ping {
  ping
}
    `) as unknown as TypedDocumentString<PingQuery, PingQueryVariables>;