import { graphql } from '@/graphql/generated';

/** 세션 복원 전 연결 확인용. codegen이 문서 0개로 실패하지 않게 하는 첫 문서이기도 하다 */
export const PingDocument = graphql(`
  query Ping {
    ping
  }
`);
