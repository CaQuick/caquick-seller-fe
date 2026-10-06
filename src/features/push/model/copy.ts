export const PUSH_COPY = {
  denied: '알림이 꺼져 있어요. 설정 > 알림 권한에서 켜면 새 주문·문의를 바로 받아요',
  channelName: '주문·문의 알림',
  foreground: (title: string, body: string) => (body ? `${title} · ${body}` : title),
};
