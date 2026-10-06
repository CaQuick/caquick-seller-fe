export const chatsKeys = {
  all: ['chats'] as const,
  conversations: () => [...chatsKeys.all, 'conversations'] as const,
  messages: (conversationId: string) => [...chatsKeys.all, 'messages', conversationId] as const,
  buyerOrder: (buyerName: string) => [...chatsKeys.all, 'buyerOrder', buyerName] as const,
};
