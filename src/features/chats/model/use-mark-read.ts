import { focusManager, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { type Conversation, type ConversationPages } from '../api/conversations';
import { markConversationRead } from '../api/messages';
import { chatsKeys } from '../api/queryKeys';
import { applyReadState } from './conversation-merge';

export const MARK_READ_DEBOUNCE_MS = 400;

/**
 * 읽음 처리. 조회만으로는 읽음이 되지 않아 진입·화면 포커스·앱 복귀·구매자 메시지 수신 때 부른다.
 * 몰려오는 계기를 디바운스로 1회로 줄이고, 응답(서버 상태)을 목록 캐시에 반영한다.
 */
export function useMarkRead(conversationId: string, onRead: (conversation: Conversation) => void) {
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focused = useRef(false);
  const { mutate } = useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: (conversation) => {
      queryClient.setQueryData<ConversationPages>(
        chatsKeys.conversations(),
        (old) => old && applyReadState(old, conversation),
      );
      onRead(conversation);
    },
  });

  const request = useCallback(() => {
    if (!focused.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      mutate();
    }, MARK_READ_DEBOUNCE_MS);
  }, [mutate]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      request();
      return () => {
        focused.current = false;
      };
    }, [request]),
  );

  useEffect(() => {
    const unsubscribe = focusManager.subscribe((isFocused) => {
      if (isFocused) request();
    });
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [request]);

  return request;
}
