import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { messageFor, subscribe } from '@/shared/api';
import { showToast } from '@/shared/ui';

import {
  type Message,
  type MessagePages,
  SellerChatsMessageAddedDocument,
  messagesQueryOptions,
  sendTextMessage,
} from '../api/messages';
import { chatsKeys } from '../api/queryKeys';
import { hasMessage, upsertMessage } from './message-list';

export const MAX_TEXT_LENGTH = 2000;

export interface PendingMessage {
  localId: string;
  text: string;
  status: 'sending' | 'failed';
}

let seq = 0;

/**
 * 채팅방 메시지: 역순 무한 조회 + 새 메시지 구독(id 중복 제거) + 전송.
 * 전송 중인 글은 서버 응답 전까지 대기 버블로 그리고, 실패하면 같은 내용으로 다시 보낼 수 있게 남긴다.
 */
export function useChatRoom(conversationId: string, onBuyerMessage: () => void) {
  const queryClient = useQueryClient();
  const key = chatsKeys.messages(conversationId);
  const query = useInfiniteQuery(messagesQueryOptions(conversationId));
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const inFlight = useRef(0);
  const onBuyer = useRef(onBuyerMessage);
  useEffect(() => {
    onBuyer.current = onBuyerMessage;
  }, [onBuyerMessage]);

  useEffect(() => {
    const messagesKey = chatsKeys.messages(conversationId);
    return subscribe(
      SellerChatsMessageAddedDocument,
      { conversationId },
      {
        next: ({ conversationMessageAdded: message }) => {
          const data = queryClient.getQueryData<MessagePages>(messagesKey);
          if (!data || hasMessage(data, message.id)) return;
          queryClient.setQueryData(messagesKey, upsertMessage(data, message));
          if (message.senderType === 'USER') onBuyer.current();
          // 보낸 계정을 모르는 판매자 메시지(다른 기기 답장)는 재조회로 바로잡는다. 내 전송은 응답이 채운다
          else if (message.senderType === 'STORE' && inFlight.current === 0)
            void queryClient.invalidateQueries({ queryKey: messagesKey });
        },
      },
    );
  }, [conversationId, queryClient]);

  const { mutate } = useMutation({
    mutationFn: ({ text }: { localId: string; text: string }) =>
      sendTextMessage(conversationId, text),
    onMutate: ({ localId, text }) => {
      inFlight.current += 1;
      setPending((list) => [
        ...list.filter((p) => p.localId !== localId),
        { localId, text, status: 'sending' },
      ]);
    },
    onSuccess: (message: Message, { localId }) => {
      queryClient.setQueryData<MessagePages>(key, (old) => old && upsertMessage(old, message));
      setPending((list) => list.filter((p) => p.localId !== localId));
      void queryClient.invalidateQueries({ queryKey: chatsKeys.conversations() });
    },
    onError: (error, { localId }) => {
      setPending((list) =>
        list.map((p) => (p.localId === localId ? { ...p, status: 'failed' } : p)),
      );
      showToast.error(messageFor(error));
    },
    onSettled: () => {
      inFlight.current -= 1;
    },
  });

  const messages = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  return {
    query,
    messages,
    pending,
    sending: pending.some((p) => p.status === 'sending'),
    send: (text: string) => mutate({ localId: `local-${++seq}`, text }),
    retry: (p: PendingMessage) => mutate({ localId: p.localId, text: p.text }),
  };
}
