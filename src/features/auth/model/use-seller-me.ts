import { useQuery } from '@tanstack/react-query';

import { sellerMeQueryOptions } from '../api/seller-me';
import { useSessionStore } from './session-store';

/** 내 판매자 계정. 변경 강제 상태에서는 BE가 막으므로 부르지 않는다 */
export function useSellerMe() {
  const enabled = useSessionStore((s) => s.status === 'authenticated' && !s.mustChangePassword);
  return useQuery({ ...sellerMeQueryOptions(), enabled });
}
