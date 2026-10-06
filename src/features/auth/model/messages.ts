import { type ForbiddenCode } from '@/shared/api';

/** auth 화면·토스트 문구 */
export const AUTH_COPY = {
  passwordChanged: '비밀번호가 변경되었어요. 다시 로그인해 주세요',
  offline: '서버에 연결할 수 없어요. 네트워크 상태를 확인해 주세요',
  passwordRule: '영문·숫자·특수문자 포함 8~64자',
  forcedChange:
    '관리자가 발급한 초기 비밀번호로 로그인했어요.\n계속하려면 새 비밀번호를 설정해 주세요.',
} as const;

/** 세션을 끝내는 403 코드별 안내 */
export const SESSION_ENDED: Record<Exclude<ForbiddenCode, 'PASSWORD_CHANGE_REQUIRED'>, string> = {
  ACCOUNT_NOT_ACTIVE: '계정이 정지되어 로그아웃되었어요. 관리자에게 문의해 주세요',
  ACCOUNT_TYPE_NOT_ALLOWED: '판매자 계정이 아니어서 로그아웃되었어요',
};
