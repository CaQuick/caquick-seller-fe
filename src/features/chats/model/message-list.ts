import { type Message, type MessagePages } from '../api/messages';

export type BubbleKind = 'user' | 'store' | 'auto' | 'system';

/**
 * 말풍선 종류. 인사말·FAQ 자동응답은 서버가 만든 STORE 메시지라 senderAccountId가 null이다.
 * 구독으로 온 STORE 메시지는 보낸 계정을 몰라(undefined) 자동응답으로 그리고, 목록 재조회가 바로잡는다.
 */
export function bubbleKind(m: Pick<Message, 'senderType' | 'senderAccountId'>): BubbleKind {
  if (m.senderType === 'USER') return 'user';
  if (m.senderType === 'SYSTEM') return 'system';
  return m.senderAccountId ? 'store' : 'auto';
}

export const hasMessage = (data: MessagePages | undefined, id: string) =>
  !!data?.pages.some((p) => p.items.some((m) => m.id === id));

/** 최신 메시지를 맨 앞에 넣는다. 같은 id가 있으면 그 자리를 새 값으로 바꾼다(전송 응답이 구독보다 늦게 와도 한 번만) */
export function upsertMessage(data: MessagePages, message: Message): MessagePages {
  if (hasMessage(data, message.id)) {
    return {
      ...data,
      pages: data.pages.map((p) => ({
        ...p,
        items: p.items.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
      })),
    };
  }
  const [first, ...rest] = data.pages;
  return {
    ...data,
    pages: [{ ...first!, items: [message, ...first!.items] }, ...rest],
  };
}

/** 표시할 본문. bodyFormat이 가리키는 필드만 읽는다(다른 쪽에도 값이 남아 있을 수 있다) */
export const messageBody = (m: Pick<Message, 'bodyFormat' | 'bodyText' | 'bodyHtml'>) =>
  (m.bodyFormat === 'HTML' ? m.bodyHtml : m.bodyText) ?? '';
