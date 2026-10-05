import {
  type CategoryType,
  type SellerProductDetailQuery,
  type SellerUpdateProductInput,
} from '@/graphql/generated/graphql';

import { toPrice } from './draft-form';

type Product = SellerProductDetailQuery['sellerProduct'];
interface Category {
  id: string;
  categoryType: CategoryType;
}

/** 가격·시간은 입력 그대로의 숫자 문자열 */
export interface EditForm {
  name: string;
  regularPrice: string;
  salePrice: string;
  description: string;
  purchaseNotice: string;
  preparationTime: string;
  eventCategoryId: string | null;
  styleCategoryId: string | null;
  tags: string[];
}

export const EDIT_COPY = {
  title: '상품 수정',
  save: '저장',
  saved: '저장되었습니다',
  imagesLink: '이미지 관리에서 추가·순서 변경 ›',
  preparationHint: '주문 후 제작에 걸리는 시간이에요. 픽업 가능 시각을 계산할 때 써요',
  leaveTitle: '수정을 그만둘까요?',
  leaveDescription: '저장하지 않은 내용은 사라져요',
  leaveConfirm: '나가기',
  leaveCancel: '계속 수정',
} as const;

const MAX_PRICE = 1_000_000_000;

export function toEditForm(product: Product, categories: readonly Category[]): EditForm {
  const typed = (type: CategoryType) =>
    product.categories.find((c) => categories.find((k) => k.id === c.id)?.categoryType === type)
      ?.id ?? null;
  return {
    name: product.name,
    regularPrice: String(product.regularPrice),
    salePrice: product.salePrice == null ? '' : String(product.salePrice),
    description: product.description ?? '',
    purchaseNotice: product.purchaseNotice ?? '',
    preparationTime: String(product.preparationTimeMinutes),
    eventCategoryId: typed('EVENT'),
    styleCategoryId: typed('STYLE'),
    tags: product.tags.map((t) => t.name),
  };
}

export type EditField = 'name' | 'regularPrice' | 'salePrice' | 'preparationTime';

export function editErrors(form: EditForm): Partial<Record<EditField, string>> {
  const errors: Partial<Record<EditField, string>> = {};
  if (!form.name.trim()) errors.name = '상품명을 입력해 주세요';
  const regular = toPrice(form.regularPrice);
  const sale = toPrice(form.salePrice);
  if (regular == null || regular < 1) errors.regularPrice = '정가를 입력해 주세요';
  else if (regular > MAX_PRICE) errors.regularPrice = '정가는 10억 원 이하로 입력해 주세요';
  if (sale != null && regular != null && sale >= regular)
    errors.salePrice = '할인가는 정가보다 작아야 해요';
  // BE가 1분 미만을 거절한다
  if (!(Number(form.preparationTime) >= 1)) errors.preparationTime = '1분 이상 입력해 주세요';
  return errors;
}

const text = (value: string) => value.trim() || null;

/** 바뀐 필드만 담는다 — 보내지 않은 필드는 BE가 그대로 둔다 */
export function toUpdateInput(
  base: EditForm,
  form: EditForm,
): Omit<SellerUpdateProductInput, 'productId'> {
  const input: Omit<SellerUpdateProductInput, 'productId'> = {};
  if (form.name.trim() !== base.name.trim()) input.name = form.name.trim();
  if (form.regularPrice !== base.regularPrice) input.regularPrice = Number(form.regularPrice);
  if (form.salePrice !== base.salePrice) input.salePrice = toPrice(form.salePrice);
  if (text(form.description) !== text(base.description)) input.description = text(form.description);
  if (text(form.purchaseNotice) !== text(base.purchaseNotice))
    input.purchaseNotice = text(form.purchaseNotice);
  if (form.preparationTime !== base.preparationTime)
    input.preparationTimeMinutes = Number(form.preparationTime);
  return input;
}

const pickedCategories = (f: EditForm) =>
  [f.eventCategoryId, f.styleCategoryId].filter((id): id is string => id != null);

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v) => b.includes(v));

export type EditStep = 'info' | 'categories' | 'tags';

export const STEP_LABEL: Record<EditStep, string> = {
  info: '상품 정보',
  categories: '카테고리',
  tags: '키워드',
};

/** 저장할 단계와 성공 뒤 기준값에 반영할 필드. 실패하면 그 단계부터 다시 계산된다 */
export function pendingSteps(base: EditForm, form: EditForm) {
  const steps: { step: EditStep; applied: Partial<EditForm> }[] = [];
  const { eventCategoryId, styleCategoryId, tags, ...info } = form;
  if (Object.keys(toUpdateInput(base, form)).length > 0)
    steps.push({ step: 'info', applied: info });
  if (!sameSet(pickedCategories(base), pickedCategories(form)))
    steps.push({ step: 'categories', applied: { eventCategoryId, styleCategoryId } });
  if (!sameSet(base.tags, tags)) steps.push({ step: 'tags', applied: { tags } });
  return steps;
}

/** 이벤트·스타일이 아닌 연결(관리자가 붙인 OTHER)은 고를 수 없어 그대로 보존한다 */
export function categoryIdsFor(
  form: EditForm,
  product: Product,
  categories: readonly Category[],
): string[] {
  const kept = product.categories
    .map((c) => c.id)
    .filter((id) => {
      const type = categories.find((k) => k.id === id)?.categoryType;
      return type !== 'EVENT' && type !== 'STYLE';
    });
  return [...pickedCategories(form), ...kept];
}
