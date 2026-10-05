import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearDraft,
  EMPTY_DRAFT,
  EMPTY_PROGRESS,
  isPristine,
  loadDraft,
  type ProductDraft,
  saveDraft,
  useDraftStore,
} from './draft-store';

const KEY = 'caquick.productDraft';

const DRAFT: ProductDraft = {
  ...EMPTY_DRAFT,
  images: [
    {
      key: 'a',
      uri: 'file:///a.jpg',
      source: null,
      publicUrl: 'https://cdn/a.jpg',
      status: 'done',
    },
    {
      key: 'b',
      uri: 'file:///b.jpg',
      source: { uri: 'file:///b.jpg', width: 1, height: 1 },
      publicUrl: null,
      status: 'failed',
    },
  ],
  name: '그림일기 케이크',
  regularPrice: '35000',
  tags: ['눈'],
  eventCategoryId: '3',
  optionGroups: [
    {
      key: 'g1',
      name: '사이즈',
      description: '',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      items: [{ key: 'i1', title: '1호', description: '', priceDelta: 5000, imageUrl: null }],
    },
  ],
};

beforeEach(async () => {
  await AsyncStorage.clear();
  useDraftStore.getState().reset();
});

describe('임시저장', () => {
  it('올라간 이미지만 publicUrl로 남기고 나머지 입력은 그대로 복원한다', async () => {
    await expect(saveDraft(DRAFT, new Date('2026-10-06T05:00:00Z'))).resolves.toBe(true);
    const saved = await loadDraft();
    expect(saved?.savedAt).toBe('2026-10-06T05:00:00.000Z');
    const { images, ...rest } = saved!.draft;
    expect(images).toEqual([
      {
        key: expect.any(String) as string,
        uri: 'https://cdn/a.jpg',
        source: null,
        publicUrl: 'https://cdn/a.jpg',
        status: 'done',
      },
    ]);
    const { images: _, ...expected } = DRAFT;
    expect(rest).toEqual(expected);
  });

  it('없거나 깨진 초안은 null', async () => {
    await expect(loadDraft()).resolves.toBeNull();
    await AsyncStorage.setItem(KEY, '{not json');
    await expect(loadDraft()).resolves.toBeNull();
    await AsyncStorage.setItem(KEY, JSON.stringify({ savedAt: 'x', draft: { name: 1 } }));
    await expect(loadDraft()).resolves.toBeNull();
  });

  it('지우면 다음 진입에 묻지 않는다', async () => {
    await saveDraft(DRAFT);
    await clearDraft();
    await expect(loadDraft()).resolves.toBeNull();
  });

  it('저장소가 실패하면 false', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(saveDraft(DRAFT)).resolves.toBe(false);
  });

  it('읽기·지우기 실패는 삼킨다', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));
    await expect(loadDraft()).resolves.toBeNull();
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('io'));
    await expect(clearDraft()).resolves.toBeUndefined();
  });
});

describe('useDraftStore', () => {
  it('이미지를 올리는 중 상태로 붙이고 key로 고치거나 지운다', () => {
    const store = useDraftStore.getState();
    const [a, b] = store.addImages([
      { uri: 'file:///1.jpg', width: 10, height: 10 },
      { uri: 'file:///2.jpg', width: 10, height: 10 },
    ]);
    expect(a!.status).toBe('uploading');
    store.updateImage(a!.key, { status: 'done', publicUrl: 'https://cdn/1.jpg' });
    store.removeImage(b!.key);
    expect(useDraftStore.getState().draft.images).toEqual([
      expect.objectContaining({ key: a!.key, status: 'done', publicUrl: 'https://cdn/1.jpg' }),
    ]);
  });

  it('복원·초기화는 진행 상태도 비운다', () => {
    const store = useDraftStore.getState();
    store.setProgress({ ...EMPTY_PROGRESS, productId: '9' });
    store.restore(DRAFT);
    expect(useDraftStore.getState()).toMatchObject({ draft: DRAFT, progress: EMPTY_PROGRESS });
    expect(isPristine(useDraftStore.getState().draft)).toBe(false);
    store.setOptionGroups([]);
    expect(useDraftStore.getState().draft.optionGroups).toEqual([]);
    store.reset();
    expect(isPristine(useDraftStore.getState().draft)).toBe(true);
  });
});
