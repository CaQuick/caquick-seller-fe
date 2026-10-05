import { configure } from '@testing-library/react-native';
import { setUpTests } from 'react-native-reanimated';

import { mockFileSizes, mockSecureStore, mockUploads } from './mocks';
import { server } from './msw/server';

// reanimated의 jest 매처·타이머 훅(expect가 있어야 해서 setupFilesAfterEnv)
setUpTests();

// findBy·waitFor 기본 1초는 커버리지 실행에서 간헐 초과한다
configure({ asyncUtilTimeout: 3000 });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  mockSecureStore.clear();
  mockFileSizes.clear();
  mockUploads.length = 0;
});
afterAll(() => server.close());
