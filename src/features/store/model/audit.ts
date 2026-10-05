import { type AuditActionType, type AuditTargetType } from '@/graphql/generated/graphql';
import { formatNumber } from '@/shared/lib/format';
import { addDays, formatYmd, kstParts, todayKst, WEEKDAYS_KO } from '@/shared/lib/kst';
import { type StatusTone } from '@/shared/ui';

export const AUDIT_COPY = {
  emptyTitle: '이력이 없어요',
  emptyDescription: '매장·상품·주문을 바꾸면 누가 언제 무엇을 바꿨는지 여기에 남아요',
  more: '이전 이력 더보기',
} as const;

export const AUDIT_FILTERS: readonly { value: AuditTargetType | null; label: string }[] = [
  { value: null, label: '전체' },
  { value: 'STORE', label: '매장' },
  { value: 'PRODUCT', label: '상품' },
  { value: 'ORDER', label: '주문' },
  { value: 'CONVERSATION', label: '대화' },
  { value: 'CHANGE_PASSWORD', label: '비밀번호' },
];

export const ACTION_VIEW: Record<AuditActionType, { label: string; tone: StatusTone }> = {
  CREATE: { label: '생성', tone: 'mint' },
  UPDATE: { label: '수정', tone: 'purple' },
  DELETE: { label: '삭제', tone: 'red' },
  STATUS_CHANGE: { label: '상태 변경', tone: 'gray' },
};

/** 어느 설정을 건드렸는지 — 기록에 남은 키로 고른다(앞이 우선) */
const AREA: readonly [string, string][] = [
  ['storeName', '기본 정보'],
  ['dayOfWeek', '영업시간'],
  ['closureDate', '특별휴무'],
  ['capacityDate', '생산 수량'],
  ['pickupSlotIntervalMinutes', '픽업 정책'],
  ['topicId', '자동응답'],
  ['optionGroupId', '옵션 그룹'],
  ['optionGroupIds', '옵션 그룹'],
  ['optionItemId', '옵션'],
  ['optionItemIds', '옵션'],
  ['imageId', '이미지'],
  ['imageIds', '이미지'],
  ['templateId', '커스텀 템플릿'],
  ['tokenId', '문구 슬롯'],
  ['tokenIds', '문구 슬롯'],
  ['categoryIds', '카테고리'],
  ['tagIds', '태그'],
];

const KEY_LABEL: Record<string, { label: string; unit?: string }> = {
  name: { label: '이름' },
  storeName: { label: '매장 이름' },
  storePhone: { label: '전화번호' },
  regularPrice: { label: '정가', unit: '원' },
  salePrice: { label: '할인가', unit: '원' },
  isActive: { label: '노출' },
  status: { label: '상태' },
  note: { label: '메모' },
  byAdmin: { label: '관리자 처리' },
  pickupSlotIntervalMinutes: { label: '슬롯 간격', unit: '분' },
  minLeadTimeMinutes: { label: '최소 리드타임', unit: '분' },
  maxDaysAhead: { label: '예약 가능 일수', unit: '일' },
  capacity: { label: '생산 수량', unit: '개' },
  capacityDate: { label: '날짜' },
  closureDate: { label: '날짜' },
  reason: { label: '사유' },
  dayOfWeek: { label: '요일' },
  isClosed: { label: '휴무' },
  tokenKey: { label: '문구 키' },
};

const ORDER_STATUS: Record<string, string> = {
  SUBMITTED: '접수',
  CONFIRMED: '확정',
  MADE: '제작 완료',
  PICKED_UP: '픽업 완료',
  CANCELED: '취소',
};

/** 식별자는 판매자에게 의미가 없어 diff에서 뺀다(영역 판별에만 쓴다) */
const isIdKey = (key: string) => /(^id|Ids?)$/.test(key.split('.').at(-1) ?? '');

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** JSON 문자열 → 객체. 객체가 아니거나 깨졌으면 null */
export function parseJson(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
}

/** 중첩 객체는 'a.b' 경로로 펼친다. 배열은 값 하나로 둔다 */
function flatten(obj: Record<string, unknown> | null, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj ?? {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) flatten(v, path).forEach((value, key) => out.set(key, value));
    else out.set(path, v);
  }
  return out;
}

const p = (n: number) => String(n).padStart(2, '0');
const truncate = (s: string, max = 60) =>
  [...s].length > max ? `${[...s].slice(0, max).join('')}…` : s;

export function formatValue(key: string, value: unknown): string {
  const leaf = key.split('.').at(-1) ?? key;
  if (value === null || value === undefined || value === '') return '없음';
  if (typeof value === 'boolean') return value ? '켬' : '끔';
  if (typeof value === 'number') {
    if (leaf === 'dayOfWeek') return WEEKDAYS_KO[value] ?? String(value);
    return `${formatNumber(value)}${KEY_LABEL[leaf]?.unit ?? ''}`;
  }
  if (typeof value === 'string') {
    if (leaf === 'status') return ORDER_STATUS[value] ?? value;
    if (/^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(value)) return value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value)) {
      const k = kstParts(value);
      return `${k.y}-${p(k.m)}-${p(k.d)} ${p(k.hh)}:${p(k.mm)}`;
    }
    return truncate(value);
  }
  if (Array.isArray(value)) return value.length ? truncate(value.map(String).join(', ')) : '없음';
  return truncate(JSON.stringify(value));
}

export interface DiffLine {
  label: string;
  before: string;
  after: string;
}

/** 키별 변경(이전 → 이후). 한쪽에만 있는 키는 '없음'과 비교한다 */
export function diffJson(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): DiffLine[] {
  const b = flatten(before);
  const a = flatten(after);
  const keys = [...new Set([...b.keys(), ...a.keys()])].filter((k) => !isIdKey(k));
  return keys.flatMap((key) => {
    if (JSON.stringify(b.get(key) ?? null) === JSON.stringify(a.get(key) ?? null)) return [];
    const leaf = key.split('.').at(-1) ?? key;
    const label = KEY_LABEL[leaf]?.label ?? key;
    return [{ label, before: formatValue(key, b.get(key)), after: formatValue(key, a.get(key)) }];
  });
}

export const DIFF_MAX_LINES = 20;

/** 펼침 메모. 20줄을 넘으면 나머지는 개수만 */
export function diffText(lines: readonly DiffLine[], max = DIFF_MAX_LINES): string {
  const shown = lines.slice(0, max).map((l) => `${l.label}: ${l.before} → ${l.after}`);
  if (lines.length > max) shown.push(`외 ${lines.length - max}줄`);
  return shown.join('\n');
}

const TARGET_LABEL: Partial<Record<AuditTargetType, string>> = {
  STORE: '매장',
  PRODUCT: '상품',
  ORDER: '주문',
  CONVERSATION: '대화',
  CHANGE_PASSWORD: '비밀번호',
};

export interface AuditLogLike {
  targetType: AuditTargetType;
  targetId: string;
  beforeJson?: string | null;
  afterJson?: string | null;
}

/** 행 제목과 펼침 diff. 비밀번호 변경은 값 없이 시각만 남긴다 */
export function describeAudit(log: AuditLogLike): { title: string; diff: DiffLine[] } {
  const label = TARGET_LABEL[log.targetType] ?? log.targetType;
  if (log.targetType === 'CHANGE_PASSWORD') return { title: label, diff: [] };
  const before = parseJson(log.beforeJson);
  const after = parseJson(log.afterJson);
  const merged = { ...before, ...after };
  const area = AREA.find(([key]) => key in merged)?.[1];
  const name = typeof merged.name === 'string' && merged.name ? merged.name : null;
  const subject =
    log.targetType === 'STORE'
      ? label
      : log.targetType === 'PRODUCT' && name
        ? name
        : `${label} #${log.targetId}`;
  return {
    title: [subject, area].filter(Boolean).join(' · '),
    diff: diffJson(before, after),
  };
}

/** 오늘 09:12 · 어제 18:02 · 10월 3일 11:20 · 해가 다르면 2025년 12월 31일 11:20 */
export function formatAuditAt(iso: string, now: Date = new Date()): string {
  const k = kstParts(iso);
  const time = `${p(k.hh)}:${p(k.mm)}`;
  const today = todayKst(now);
  const ymd = formatYmd(k);
  if (ymd === formatYmd(today)) return `오늘 ${time}`;
  if (ymd === formatYmd(addDays(today, -1))) return `어제 ${time}`;
  const md = `${k.m}월 ${k.d}일 ${time}`;
  return k.y === today.y ? md : `${k.y}년 ${md}`;
}
