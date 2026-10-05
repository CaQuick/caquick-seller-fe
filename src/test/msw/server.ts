import { setupServer } from 'msw/node';

/** 전역 MSW 서버. 핸들러는 각 spec이 server.use로 등록한다(계약별 헬퍼는 ./graphql). */
export const server = setupServer();
