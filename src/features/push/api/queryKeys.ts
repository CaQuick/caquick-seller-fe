/** 푸시 권한·토큰 상태는 기기 로컬 값이라 BE 질의가 없다 — 설정 화면 표시용 키만 둔다 */
export const pushKeys = {
  all: ['push'] as const,
  permission: () => [...pushKeys.all, 'permission'] as const,
  token: () => [...pushKeys.all, 'token'] as const,
};
