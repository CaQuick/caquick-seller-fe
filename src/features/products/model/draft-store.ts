import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { create } from 'zustand';

import { type PickedImage } from '@/shared/lib/upload';

import { newKey, type OptionGroupValue } from './draft-options';

export type ImageStatus = 'uploading' | 'done' | 'failed';

export interface DraftImage {
  key: string;
  /** 표시용. 업로드 전에는 기기 파일, 복원한 초안은 publicUrl */
  uri: string;
  /** 재시도용 원본. 복원한 이미지는 이미 올라가 있어 없다 */
  source: PickedImage | null;
  publicUrl: string | null;
  status: ImageStatus;
}

export interface ProductDraft {
  images: DraftImage[];
  name: string;
  /** 숫자만 담은 입력값. 표시할 때 천단위를 붙인다 */
  regularPrice: string;
  salePrice: string;
  description: string;
  purchaseNotice: string;
  eventCategoryId: string | null;
  styleCategoryId: string | null;
  tags: string[];
  optionGroups: OptionGroupValue[];
}

/** 등록 체인이 어디까지 갔는지. 실패 뒤 재시도는 끝난 단계를 건너뛴다 */
export interface SubmitProgress {
  productId: string | null;
  addedImages: number;
  categoriesDone: boolean;
  tagsDone: boolean;
  groupIds: Record<string, string>;
  itemIds: Record<string, string>;
  activated: boolean;
}

export const EMPTY_DRAFT: ProductDraft = {
  images: [],
  name: '',
  regularPrice: '',
  salePrice: '',
  description: '',
  purchaseNotice: '',
  eventCategoryId: null,
  styleCategoryId: null,
  tags: [],
  optionGroups: [],
};

export const EMPTY_PROGRESS: SubmitProgress = {
  productId: null,
  addedImages: 0,
  categoriesDone: false,
  tagsDone: false,
  groupIds: {},
  itemIds: {},
  activated: false,
};

type Updater<T> = T | ((prev: T) => T);

interface DraftState {
  draft: ProductDraft;
  progress: SubmitProgress;
  patch: (patch: Partial<Omit<ProductDraft, 'images' | 'optionGroups'>>) => void;
  addImages: (sources: PickedImage[]) => DraftImage[];
  updateImage: (key: string, patch: Partial<DraftImage>) => void;
  removeImage: (key: string) => void;
  setOptionGroups: (next: Updater<OptionGroupValue[]>) => void;
  setProgress: (progress: SubmitProgress) => void;
  restore: (draft: ProductDraft) => void;
  reset: () => void;
}

/** 등록 3단계가 함께 쓰는 폼 상태. 등록 Stack이 내려가면 비운다 */
export const useDraftStore = create<DraftState>()((set) => ({
  draft: EMPTY_DRAFT,
  progress: EMPTY_PROGRESS,
  patch: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  addImages: (sources) => {
    const added = sources.map<DraftImage>((source) => ({
      key: newKey('img'),
      uri: source.uri,
      source,
      publicUrl: null,
      status: 'uploading',
    }));
    set((s) => ({ draft: { ...s.draft, images: [...s.draft.images, ...added] } }));
    return added;
  },
  updateImage: (key, patch) =>
    set((s) => ({
      draft: {
        ...s.draft,
        images: s.draft.images.map((img) => (img.key === key ? { ...img, ...patch } : img)),
      },
    })),
  removeImage: (key) =>
    set((s) => ({
      draft: { ...s.draft, images: s.draft.images.filter((img) => img.key !== key) },
    })),
  setOptionGroups: (next) =>
    set((s) => ({
      draft: {
        ...s.draft,
        optionGroups: typeof next === 'function' ? next(s.draft.optionGroups) : next,
      },
    })),
  setProgress: (progress) => set({ progress }),
  restore: (draft) => set({ draft, progress: EMPTY_PROGRESS }),
  reset: () => set({ draft: EMPTY_DRAFT, progress: EMPTY_PROGRESS }),
}));

export const isPristine = (draft: ProductDraft) =>
  JSON.stringify(draft) === JSON.stringify(EMPTY_DRAFT);

// ── 임시저장(D30): 기기 로컬 1벌. 이미지는 올라간 publicUrl만 남긴다 ──

const STORAGE_KEY = 'caquick.productDraft';

const itemSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  priceDelta: z.number().int(),
  imageUrl: z.string().nullable(),
});
const storedSchema = z.object({
  savedAt: z.string(),
  draft: z.object({
    imageUrls: z.array(z.string()),
    name: z.string(),
    regularPrice: z.string(),
    salePrice: z.string(),
    description: z.string(),
    purchaseNotice: z.string(),
    eventCategoryId: z.string().nullable(),
    styleCategoryId: z.string().nullable(),
    tags: z.array(z.string()),
    optionGroups: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
        description: z.string(),
        isRequired: z.boolean(),
        minSelect: z.number().int(),
        maxSelect: z.number().int(),
        items: z.array(itemSchema),
      }),
    ),
  }),
});

export interface SavedDraft {
  savedAt: string;
  draft: ProductDraft;
}

export async function saveDraft(draft: ProductDraft, now = new Date()): Promise<boolean> {
  const { images, ...rest } = draft;
  const imageUrls = images.flatMap((img) => (img.publicUrl ? [img.publicUrl] : []));
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: now.toISOString(), draft: { ...rest, imageUrls } }),
    );
    return true;
  } catch {
    return false;
  }
}

/** 없거나 읽을 수 없는 초안(앱 버전이 바뀌어 모양이 다른 것 포함)은 null */
export async function loadDraft(): Promise<SavedDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const { imageUrls, ...rest } = parsed.data.draft;
    const images = imageUrls.map<DraftImage>((url) => ({
      key: newKey('img'),
      uri: url,
      source: null,
      publicUrl: url,
      status: 'done',
    }));
    return { savedAt: parsed.data.savedAt, draft: { ...rest, images } };
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // 지우지 못한 초안은 다음 진입 때 복원 여부를 다시 묻는다
  }
}
