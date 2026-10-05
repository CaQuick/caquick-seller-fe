import { create } from 'zustand';

import { type CredentialSession } from '@/shared/api';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  /** 메모리에만 둔다. refreshToken은 SecureStore(session.ts)에만 있다 */
  accessToken: string | null;
  mustChangePassword: boolean;
  setSession: (res: Pick<CredentialSession, 'accessToken' | 'mustChangePassword'>) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'unknown',
  accessToken: null,
  mustChangePassword: false,
  setSession: (res) =>
    set({
      status: 'authenticated',
      accessToken: res.accessToken,
      mustChangePassword: res.mustChangePassword,
    }),
  clear: () => set({ status: 'anonymous', accessToken: null, mustChangePassword: false }),
}));
