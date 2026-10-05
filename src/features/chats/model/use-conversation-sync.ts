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
          // 아직 목록이 없으면 첫 조회가 최신 상태를 가져온다
          if (!data) return;
          const { data: merged, applied, previous } = mergeConversationUpdate(data, event);
          if (!applied) return;
          queryClient.setQueryData(key, merged);
          if (applied.unreadCount > (previous?.unreadCount ?? 0)) notify.current(applied);
        },
      }),
    [queryClient],
  );
}
