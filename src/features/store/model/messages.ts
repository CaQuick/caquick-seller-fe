import { ApiError, messageFor } from '@/shared/api';
import { withJosa } from '@/shared/lib/josa';

/** 매장 설정 화면 문구 */
export const STORE_COPY = {
  saved: '저장되었습니다',
  hoursSaved: (day: string) => `${day}요일 영업시간이 저장되었습니다`,
  hoursOrder: '종료 시각은 시작보다 늦어야 해요',
  hoursHint:
    '스위치를 끄면 그 요일은 휴무로 표시돼요. 시간이나 스위치를 바꾸면 행마다 바로 저장됩니다.',
  closureAdded: '휴무를 추가했어요',
  closureDeleted: '휴무를 삭제했어요',
  closureEmpty: '등록된 특별휴무가 없어요',
  closureEmptyHint: '정기 휴무일(영업시간)과 별도로 쉬는 날을 등록해요',
  closureDefaultReason: '휴무',
  capacityHint:
    '숫자는 그날 받을 수 있는 케이크 수예요. 날짜를 누르면 바꿀 수 있고, 따로 정하지 않은 날은 수량 제한이 없어요.',
  capacitySheet: '이날 받을 수 있는 케이크 수',
  capacitySaved: '생산 수량을 저장했어요',
  capacityCleared: '수량 제한을 해제했어요',
  inactiveStore: '매장이 비공개 상태라 구매자 달력을 미리 볼 수 없어요',
  logoUploading: '로고를 올리는 중이에요',
  greetingHint: '비워 두면 기본 인사말이 나가요',
  leadRange: (max: number) => `최소 리드타임은 0~${max}분 사이로 입력해 주세요.`,
} as const;

const FIELD_LABEL: Record<string, { label: string; unit: string }> = {
  pickupSlotIntervalMinutes: { label: '슬롯 간격', unit: '분' },
  minLeadTimeMinutes: { label: '최소 리드타임', unit: '분' },
  maxDaysAhead: { label: '예약 가능 일수', unit: '일' },
  capacity: { label: '생산 수량', unit: '개' },
};

const CODE_MESSAGE: Record<string, string> = {
  CLOSE_BEFORE_OPEN: STORE_COPY.hoursOrder,
  OPEN_CLOSE_TIME_REQUIRED: '시작·종료 시각을 모두 정해 주세요.',
  SPECIAL_CLOSURE_NOT_FOUND: '이미 삭제된 휴무예요.',
  DAILY_CAPACITY_NOT_FOUND: '이미 해제된 수량 설정이에요.',
  INVALID_IMAGE_URL: '로고를 다시 올려 주세요.',
  TEXT_REQUIRED: '필수 항목을 입력해 주세요.',
};

/** BE FIELD_OUT_OF_RANGE 문구는 필드명이 영문이다 — '{field}은(는) {min}~{max} 사이여야 합니다.' */
const OUT_OF_RANGE = /^(\w+)은\(는\) (\d+)~(\d+) 사이여야 합니다\.?$/;

export function storeErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code) {
    if (error.code === 'FIELD_OUT_OF_RANGE') {
      const [, field = '', min, max] = OUT_OF_RANGE.exec(error.message) ?? [];
      const known = FIELD_LABEL[field];
      if (known) {
        return `${withJosa(known.label, '은/는')} ${min}~${max}${known.unit} 사이로 입력해 주세요.`;
      }
      return '입력한 값이 허용 범위를 벗어났어요.';
    }
    const mapped = CODE_MESSAGE[error.code];
    if (mapped) return mapped;
  }
  return messageFor(error);
}
