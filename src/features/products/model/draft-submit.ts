import { deleteProduct, setProductActive } from '../api/browse';
import {
  addProductImage,
  createOptionGroup,
  createOptionItem,
  createProduct,
  setProductCategories,
  setProductTags,
} from '../api/create';
import { categoryIds, toCreateInput, uploadedUrls } from './draft-form';
import { type ProductDraft, type SubmitProgress } from './draft-store';

export const CREATE_STEPS = [
  { id: 'product', label: '상품 만들기' },
  { id: 'images', label: '이미지 추가' },
  { id: 'categories', label: '카테고리 연결' },
  { id: 'tags', label: '키워드 연결' },
  { id: 'options', label: '옵션 추가' },
  { id: 'activate', label: '판매 시작' },
] as const;

export type CreateStepId = (typeof CREATE_STEPS)[number]['id'];

export class CreateChainError extends Error {
  readonly step: CreateStepId;
  readonly cause: unknown;
  constructor(step: CreateStepId, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'CreateChainError';
    this.step = step;
    this.cause = cause;
  }
}

const DEFAULT_API = {
  createProduct,
  addProductImage,
  setProductCategories,
  setProductTags,
  createOptionGroup,
  createOptionItem,
  setProductActive: async (productId: string) => {
    await setProductActive(productId, true);
  },
  deleteProduct,
};
export type CreateApi = typeof DEFAULT_API;

interface Hooks {
  /** 호출 하나가 성공할 때마다 — 실패해도 여기까지는 보존된다 */
  onProgress: (progress: SubmitProgress) => void;
  onStep: (step: CreateStepId) => void;
}

/**
 * 생성(숨김) → 이미지 2장째부터 → 카테고리 → 태그 → 옵션 그룹·아이템 → 노출.
 * start에 이미 끝난 호출은 건너뛰므로 실패 뒤 같은 progress로 다시 부르면 이어서 진행한다
 */
export async function runCreateChain(
  draft: ProductDraft,
  start: SubmitProgress,
  { onProgress, onStep }: Hooks,
  api: CreateApi = DEFAULT_API,
): Promise<string> {
  let progress = start;
  const commit = (patch: Partial<SubmitProgress>) => {
    progress = { ...progress, ...patch };
    onProgress(progress);
  };
  const step = async <T>(id: CreateStepId, run: () => Promise<T>): Promise<T> => {
    onStep(id);
    try {
      return await run();
    } catch (e) {
      throw new CreateChainError(id, e);
    }
  };

  const id = await step('product', async () => {
    if (progress.productId != null) return progress.productId;
    const created = await api.createProduct(toCreateInput(draft));
    commit({ productId: created });
    return created;
  });

  await step('images', async () => {
    for (const url of uploadedUrls(draft).slice(1 + progress.addedImages)) {
      await api.addProductImage(id, url);
      commit({ addedImages: progress.addedImages + 1 });
    }
  });

  await step('categories', async () => {
    const ids = categoryIds(draft);
    if (progress.categoriesDone || ids.length === 0) return;
    await api.setProductCategories(id, ids);
    commit({ categoriesDone: true });
  });

  await step('tags', async () => {
    if (progress.tagsDone || draft.tags.length === 0) return;
    await api.setProductTags(id, draft.tags);
    commit({ tagsDone: true });
  });

  await step('options', async () => {
    for (const [gi, g] of draft.optionGroups.entries()) {
      let groupId = progress.groupIds[g.key];
      if (groupId == null) {
        groupId = await api.createOptionGroup({
          productId: id,
          name: g.name,
          description: g.description.trim() || undefined,
          isRequired: g.isRequired,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          sortOrder: gi,
        });
        commit({ groupIds: { ...progress.groupIds, [g.key]: groupId } });
      }
      for (const [ii, item] of g.items.entries()) {
        if (progress.itemIds[item.key] != null) continue;
        const itemId = await api.createOptionItem({
          optionGroupId: groupId,
          title: item.title,
          description: item.description.trim() || undefined,
          imageUrl: item.imageUrl ?? undefined,
          priceDelta: item.priceDelta,
          sortOrder: ii,
        });
        commit({ itemIds: { ...progress.itemIds, [item.key]: itemId } });
      }
    }
  });

  await step('activate', async () => {
    if (progress.activated) return;
    await api.setProductActive(id);
    commit({ activated: true });
  });
  return id;
}

/** 포기: 반쯤 만든(숨김) 상품을 지운다. 아직 만들지 않았으면 할 일이 없다 */
export async function abandonCreate(
  progress: SubmitProgress,
  api: Pick<CreateApi, 'deleteProduct'> = DEFAULT_API,
): Promise<void> {
  if (progress.productId != null) await api.deleteProduct(progress.productId);
}
