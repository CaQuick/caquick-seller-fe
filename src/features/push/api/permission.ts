import { queryOptions } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { pushKeys } from './queryKeys';

/** OS 권한은 앱 밖에서 바뀐다 — 포그라운드 복귀마다 다시 읽는다 */
export const pushPermissionQueryOptions = () =>
  queryOptions({
    queryKey: pushKeys.permission(),
    queryFn: async () => (await Notifications.getPermissionsAsync()).granted,
    staleTime: 0,
  });
