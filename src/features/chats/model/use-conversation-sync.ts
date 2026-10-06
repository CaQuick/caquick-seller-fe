import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { subscribe } from '@/shared/api';

import {
  type Conversation,
  type ConversationPages,
  SellerChatsConversationUpdatedDocument,
} from '../api/conversations';
import { chatsKeys } from '../api/queryKeys';
import { mergeConversationUpdate } from './conversation-merge';

/** 대화 목록 구독. 오래된 이벤트는 버리고, 미읽음이 늘어난 대화(새 문의)를 알린다 */
export function useConversationSync(onNewInquiry: (conversation: Conversation) => void) {
  const queryClient = useQueryClient();
  const notify = useRef(onNewInquiry);
  useEffect(() => {
    notify.current = onNewInquiry;
  }, [onNewInquiry]);

  useEffect(
    () =>
      subscribe(SellerChatsConversationUpdatedDocument, undefined, {
        next: ({ sellerConversationUpdated: event }) => {
          const key = chatsKeys.conversations();
          const data = queryClient.getQueryData<ConversationPages>(key);
          // 첫 조회 중이면 응답이 이 이벤트 전 스냅샷일 수 있다. 데이터 없는 조회는 무효화로
          // 취소되지 않아(진행 중 요청을 재사용) 초기화해 다시 부르고, 새 목록이 보여 주니 알리지 않는다
          if (!data) {
            void queryClient.resetQueries({ queryKey: key });
            return;
          }
          const { data: merged, applied, previous } = mergeConversationUpdate(data, event);
          if (!applied) return;
          queryClient.setQueryData(key, merged);
          if (applied.unreadCount > (previous?.unreadCount ?? 0)) notify.current(applied);
        },
      }),
    [queryClient],
  );
}
