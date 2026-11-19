import { type SettlementStatusType } from '@/graphql/generated/graphql';
import { enumView } from '@/shared/lib/enum-view';
import { parseYmd, WEEKDAYS_KO, type YmdDate } from '@/shared/lib/kst';
import { type StatusTone } from '@/shared/ui';

export const SETTLEMENT_COPY = {
  emptyTitle: '아직 정산 내역이 없어요',
  emptyDescription:
    '매주 월요일에 지난주(월~일) 픽업 완료·노쇼 주문과 구매자 사정 취소의 남은 금액을 묶어 정산해요',
  more: '이전 정산 더보기',
  notFound: '정산을 찾을 수 없어요',
} as const;

interface StatusView {
  label: string;
  tone: StatusTone;
}

export const settlementStatusView = enumView<StatusView>(
  {
    PENDING: { label: '송금 대기', tone: 'gray' },
    PAID: { label: '송금 완료', tone: 'done' },
  } satisfies Record<SettlementStatusType, StatusView>,
  { label: '확인 필요', tone: 'gray' },
);

const day = (ymd: string, withYear: boolean) => {
  const date = parseYmd(ymd);
  if (!date) return ymd;
  const weekday = WEEKDAYS_KO[new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay()];
  return `${withYear ? `${date.y}년 ` : ''}${date.m}월 ${date.d}일 (${weekday})`;
};

/** '11월 10일 (월) ~ 11월 16일 (일)'. 올해가 아닌 날이 끼면 두 날짜 모두 연도를 붙인다 */
export function formatPeriod(start: string, end: string, today: YmdDate): string {
  const year = String(today.y);
  const withYear = !start.startsWith(year) || !end.startsWith(year);
  return `${day(start, withYear)} ~ ${day(end, withYear)}`;
}
