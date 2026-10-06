import { type SellerCreateProductInput } from '@/graphql/generated/graphql';
import { formatNumber } from '@/shared/lib/format';

import { type ProductDraft } from './draft-store';

/** BE MAX_PRODUCT_IMAGES와 같다 — 넘치면 sellerAddProductImage가 거절한다 */
export const MAX_IMAGES = 6;
export const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 80;
const MAX_PRICE = 1_000_000_000;
export const MAX_NAME_LENGTH = 200;

export const CREATE_COPY = {
  title: '상품 등록',
  step1: '기본 정보',
  step2: '옵션 정보',
  step3: '등록 미리보기',
  saveDraft: '임시저장',
  next: '다음',
  draftSaved: '임시저장했어요',
  draftSaveFailed: '임시저장하지 못했어요. 잠시 후 다시 시도해 주세요',
  restoreTitle: '임시저장한 상품이 있어요',
  restoreConfirm: '불러오기',
  restoreCancel: '새로 작성',
  leaveTitle: '상품 등록을 그만둘까요?',
  leaveDescription: '임시저장하지 않은 내용은 사라져요',
  leaveConfirm: '나가기',
  leaveCancel: '계속 작성',
  created: '상품이 등록되었습니다',
  abandoned: '등록을 취소했어요',
} as const;

export const toDigits = (text: string) => text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

export const priceText = (digits: string) => (digits ? formatNumber(Number(digits)) : '');

export const toPrice = (digits: string): number | null => (digits ? Number(digits) : null);

export type BasicField = 'images' | 'name' | 'regularPrice' | 'salePrice';
export type BasicErrors = Partial<Record<BasicField, string>>;

/** 할인가는 입력 즉시, 나머지는 '다음'을 누른 뒤에 보여준다 */
export function basicErrors(draft: ProductDraft): BasicErrors {
  const errors: BasicErrors = {};
  const { images } = draft;
  if (images.some((img) => img.status === 'uploading'))
    errors.images = '이미지를 올리는 중이에요. 끝나면 넘어갈 수 있어요';
  else if (images.some((img) => img.status === 'failed'))
    errors.images = '올리지 못한 이미지를 다시 시도하거나 지워 주세요';
  else if (images.length === 0) errors.images = '이미지를 1장 이상 올려 주세요';

  if (!draft.name.trim()) errors.name = '상품명을 입력해 주세요';

  const regular = toPrice(draft.regularPrice);
  const sale = toPrice(draft.salePrice);
  if (regular == null || regular < 1) errors.regularPrice = '정가를 입력해 주세요';
  else if (regular > MAX_PRICE) errors.regularPrice = '정가는 10억 원 이하로 입력해 주세요';
  if (sale != null && regular != null && sale >= regular)
    errors.salePrice = '할인가는 정가보다 낮아야 해요';
  return errors;
}

/** BE 태그 정규화(D34)와 같은 규칙 — 칩과 저장 결과가 어긋나지 않게 */
export function normalizeTag(raw: string): string | null {
  const name = raw
    .trim()
    .replace(/^#+/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFC');
  return name || null;
}

export function addTag(
  tags: readonly string[],
  raw: string,
): { tags: string[]; error: string | null } {
  const name = normalizeTag(raw);
  if (!name || tags.includes(name)) return { tags: [...tags], error: null };
  if ([...name].length > MAX_TAG_LENGTH)
    return { tags: [...tags], error: `키워드는 ${MAX_TAG_LENGTH}자까지 입력할 수 있어요` };
  if (tags.length >= MAX_TAGS)
    return { tags: [...tags], error: `키워드는 최대 ${MAX_TAGS}개까지 등록할 수 있어요` };
  return { tags: [...tags, name], error: null };
}

export const uploadedUrls = (draft: ProductDraft) =>
  draft.images.flatMap((img) => (img.publicUrl ? [img.publicUrl] : []));

const optional = (text: string) => text.trim() || undefined;

/** 숨김으로 만들고 체인 끝에 켠다 — 중간에 실패해도 반쯤 만든 상품이 구매자에게 보이지 않는다 */
export function toCreateInput(draft: ProductDraft): SellerCreateProductInput {
  const sale = toPrice(draft.salePrice);
  return {
    name: draft.name.trim(),
    initialImageUrl: uploadedUrls(draft)[0] ?? '',
    description: optional(draft.description),
    purchaseNotice: optional(draft.purchaseNotice),
    regularPrice: toPrice(draft.regularPrice) ?? 0,
    salePrice: sale ?? undefined,
    isActive: false,
  };
}

export const categoryIds = (draft: ProductDraft) =>
  [draft.eventCategoryId, draft.styleCategoryId].filter((id): id is string => id != null);
