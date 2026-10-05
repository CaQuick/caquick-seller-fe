export const chatsKeys = {
  all: ['chats'] as const,
  conversations: () => [...chatsKeys.all, 'conversations'] as const,
  messages: (conversationId: string) => [...chatsKeys.all, 'messages', conversationId] as const,
};
