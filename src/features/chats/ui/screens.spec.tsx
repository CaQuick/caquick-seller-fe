import { renderRouter, screen } from 'expo-router/testing-library';

import { ChatRoomScreen, ChatsScreen } from './screens';

describe('채팅 화면 골격', () => {
  it.each([
    ['/chats', '문의가 없습니다'],
    ['/chats/c1', '대화 #c1의 메시지를 불러옵니다.'],
  ])('%s → "%s"', async (url, text) => {
    await renderRouter(
      { chats: ChatsScreen, 'chats/[conversationId]': ChatRoomScreen },
      { initialUrl: url },
    );
    expect(await screen.findByText(text)).toBeTruthy();
  });
});
