import { renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { gqlError, gqlOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { useSessionStore } from './session-store';
import { useSellerMe } from './use-seller-me';

const me = {
  accountId: '7',
  username: 'hazecake',
  displayName: null,
  storeId: '3',
  mustChangePassword: false,
  accountStatus: 'ACTIVE',
};
const wrapper = ({ children }: { children: ReactNode }) => <Providers>{children}</Providers>;

describe('useSellerMe', () => {
  it('로그인된 판매자의 계정을 읽는다', async () => {
    useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: false });
    server.use(gqlOk('SellerAuthMe', { sellerMe: me }));
    const { result } = await renderHook(() => useSellerMe(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(me));
  });

  it.each([
    [
      '변경 강제',
      () => useSessionStore.getState().setSession({ accessToken: 'at', mustChangePassword: true }),
    ],
    ['로그아웃', () => useSessionStore.getState().clear()],
  ])('반증: %s 상태면 부르지 않는다', async (_, arrange) => {
    arrange();
    // 불렸다면 이 오류가 결과에 남는다
    server.use(
      gqlError('SellerAuthMe', {
        message: 'x',
        code: 'PASSWORD_CHANGE_REQUIRED',
        classification: 'FORBIDDEN',
        statusCode: 403,
      }),
    );
    const { result } = await renderHook(() => useSellerMe(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });
});
