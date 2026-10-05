import { renderHook, waitFor } from '@testing-library/react-native';
import * as Updates from 'expo-updates';

import { useOtaUpdate } from './use-ota-update';

const state = { enabled: true, available: false };
jest.mock('expo-updates', () => ({
  get isEnabled() {
    return state.enabled;
  },
  checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: state.available })),
  fetchUpdateAsync: jest.fn(() => Promise.resolve({ isNew: true })),
  reloadAsync: jest.fn(() => Promise.resolve()),
}));

const g = globalThis as unknown as { __DEV__: boolean };

describe('useOtaUpdate', () => {
  const devFlag = g.__DEV__;
  beforeEach(() => {
    g.__DEV__ = false;
    state.enabled = true;
    state.available = false;
    jest.mocked(Updates.checkForUpdateAsync).mockClear();
    jest.mocked(Updates.fetchUpdateAsync).mockClear();
    jest.mocked(Updates.reloadAsync).mockClear();
  });
  afterAll(() => {
    g.__DEV__ = devFlag;
  });

  it.each([
    ['dev client', true, true],
    ['업데이트가 꺼진 빌드', false, false],
  ])('%s에서는 확인하지 않는다', async (_, dev, enabled) => {
    g.__DEV__ = dev;
    state.enabled = enabled;
    await renderHook(() => useOtaUpdate());
    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('새 업데이트가 없으면 확인만 한다', async () => {
    await renderHook(() => useOtaUpdate());
    await waitFor(() => expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1));
    expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('새 업데이트가 있으면 받아서 다시 시작한다', async () => {
    state.available = true;
    await renderHook(() => useOtaUpdate());
    await waitFor(() => expect(Updates.reloadAsync).toHaveBeenCalledTimes(1));
    expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('확인에 실패해도 앱은 그대로 뜬다', async () => {
    jest.mocked(Updates.checkForUpdateAsync).mockRejectedValueOnce(new Error('offline'));
    await renderHook(() => useOtaUpdate());
    await waitFor(() => expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1));
    await new Promise((r) => setImmediate(r));
    expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
  });
});
