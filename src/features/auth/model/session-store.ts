import { create } from 'zustand';

import { type CredentialSession } from '@/shared/api';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

type SessionPayload = Pick<CredentialSession, 'accessToken' | 'mustChangePassword'> &
  Partial<Pick<CredentialSession, 'expiresInSeconds'>>;

interface SessionState {
  status: SessionStatus;
  /** 메모리에만 둔다. refreshToken은 SecureStore(session.ts)에만 있다 */
  accessToken: string | null;
  /** accessToken 만료 시각(epoch ms). 선제 refresh 타이머가 읽는다 */
  expiresAt: number | null;
  mustChangePassword: boolean;
  setSession: (res: SessionPayload) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'unknown',
  accessToken: null,
  expiresAt: null,
  mustChangePassword: false,
  setSession: (res) =>
    set({
      status: 'authenticated',
      accessToken: res.accessToken,
      expiresAt: res.expiresInSeconds ? Date.now() + res.expiresInSeconds * 1000 : null,
      mustChangePassword: res.mustChangePassword,
    }),
  clear: () =>
    set({ status: 'anonymous', accessToken: null, expiresAt: null, mustChangePassword: false }),
}));
