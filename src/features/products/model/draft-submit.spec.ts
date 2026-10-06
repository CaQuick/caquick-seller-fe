import { ApiError } from '@/shared/api';

import {
  type DraftImage,
  EMPTY_DRAFT,
  EMPTY_PROGRESS,
  type ProductDraft,
  type SubmitProgress,
} from './draft-store';
import {
  abandonCreate,
  CreateChainError,
  type CreateApi,
  type CreateStepId,
  runCreateChain,
} from './draft-submit';

const img = (n: number): DraftImage => ({
  key: `k${n}`,
  uri: `u${n}`,
  source: null,
  publicUrl: `https://cdn/${n}.jpg`,
  status: 'done',
});

const DRAFT: ProductDraft = {
  ...EMPTY_DRAFT,
  images: [img(1), img(2), img(3)],
  name: '그림일기 케이크',
  regularPrice: '35000',
  salePrice: '33000',
  eventCategoryId: '11',
  styleCategoryId: '22',
  tags: ['눈', '트리'],
  optionGroups: [
    {
      key: 'g1',
      name: '사이즈',
      description: ' 사이즈를 골라요 ',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      items: [
        { key: 'i1', title: '0호', description: '', priceDelta: 0, imageUrl: null },
        {
          key: 'i2',
          title: '1호',
          description: '15cm',
          priceDelta: 5000,
          imageUrl: 'https://cdn/o.jpg',
        },
      ],
    },
    {
      key: 'g2',
      name: '맛',
      description: '',
      isRequired: false,
      minSelect: 0,
      maxSelect: 2,
      items: [{ key: 'i3', title: '기본', description: '', priceDelta: 0, imageUrl: null }],
    },
  ],
};

/** 호출을 순서대로 기록하는 가짜 API. failAt 번째 호출(0부터)에서 한 번 실패한다 */
function fakeApi(failAt?: number) {
  const calls: string[] = [];
  let n = 0;
  let ids = 0;
  const call = async <T>(label: string, value: T): Promise<T> => {
    const i = n++;
    if (i === failAt) throw new ApiError('잠시 후 다시 시도해 주세요', 'NETWORK', null, 0);
    calls.push(label);
    return Promise.resolve(value);
  };
  const api: CreateApi = {
    createProduct: (input) =>
      call(`create ${input.initialImageUrl} active=${input.isActive}`, '100'),
    addProductImage: (id, url) => call(`image ${id} ${url}`, undefined),
    setProductCategories: (id, cats) => call(`categories ${id} ${cats.join(',')}`, undefined),
    setProductTags: (id, names) => call(`tags ${id} ${names.join(',')}`, undefined),
    createOptionGroup: (input) =>
      call(
        `group ${input.productId} ${input.name}/${input.description}/${input.sortOrder}/${input.minSelect}-${input.maxSelect}`,
        `G${++ids}`,
      ),
    createOptionItem: (input) =>
      call(
        `item ${input.optionGroupId} ${input.title}/${input.priceDelta}/${input.sortOrder}/${input.description}/${input.imageUrl}`,
        `I${++ids}`,
      ),
    setProductActive: (id) => call(`active ${id}`, undefined),
    deleteProduct: (id) => call(`delete ${id}`, undefined),
  };
  return { api, calls };
}

const FULL_CHAIN = [
  'create https://cdn/1.jpg active=false',
  'image 100 https://cdn/2.jpg',
  'image 100 https://cdn/3.jpg',
  'categories 100 11,22',
  'tags 100 눈,트리',
  'group 100 사이즈/사이즈를 골라요/0/1-1',
  'item G1 0호/0/0/undefined/undefined',
  'item G1 1호/5000/1/15cm/https://cdn/o.jpg',
  'group 100 맛/undefined/1/0-2',
  'item G4 기본/0/0/undefined/undefined',
  'active 100',
];

function run(start: SubmitProgress, api: CreateApi) {
  const progress: SubmitProgress[] = [];
  const steps: CreateStepId[] = [];
  const result = runCreateChain(
    DRAFT,
    start,
    { onProgress: (p) => progress.push(p), onStep: (s) => steps.push(s) },
    api,
  );
  return { result, progress, steps };
}

describe('runCreateChain', () => {
  it('숨김 생성 → 이미지 2장째부터 → 카테고리 → 태그 → 옵션 → 노출 순서로 부르고 상품 id를 돌려준다', async () => {
    const { api, calls } = fakeApi();
    const { result, steps } = run(EMPTY_PROGRESS, api);
    await expect(result).resolves.toBe('100');
    expect(calls).toEqual(FULL_CHAIN);
    expect(steps).toEqual(['product', 'images', 'categories', 'tags', 'options', 'activate']);
  });

  it('카테고리·태그·옵션이 없으면 그 호출을 건너뛴다', async () => {
    const { api, calls } = fakeApi();
    const bare = {
      ...DRAFT,
      images: [img(1)],
      eventCategoryId: null,
      styleCategoryId: null,
      tags: [],
      optionGroups: [],
    };
    await runCreateChain(bare, EMPTY_PROGRESS, { onProgress: jest.fn(), onStep: jest.fn() }, api);
    expect(calls).toEqual(['create https://cdn/1.jpg active=false', 'active 100']);
  });

  it.each(FULL_CHAIN.map((label, i) => [i, label] as const))(
    '%i번째 호출(%s)에서 실패해도 그때까지의 진행을 보존하고, 그 진행으로 다시 부르면 남은 호출만 한다',
    async (failAt) => {
      const { api, calls } = fakeApi(failAt);
      const first = run(EMPTY_PROGRESS, api);
      await expect(first.result).rejects.toBeInstanceOf(CreateChainError);
      expect(calls).toEqual(FULL_CHAIN.slice(0, failAt));
      const saved = first.progress.at(-1) ?? EMPTY_PROGRESS;
      if (failAt > 0) expect(saved.productId).toBe('100');

      const retry = run(saved, api);
      await expect(retry.result).resolves.toBe('100');
      // 반증: 진행을 버리고 처음부터 다시 하면 상품·옵션이 두 번 만들어진다
      expect(calls.filter((c) => c.startsWith('create'))).toHaveLength(1);
      expect(calls.map((c) => c.replace(/G\d+/, 'G'))).toEqual(
        FULL_CHAIN.map((c) => c.replace(/G\d+/, 'G')),
      );
    },
  );

  it('실패한 단계와 원인을 함께 던진다', async () => {
    const { api } = fakeApi(3);
    const { result } = run(EMPTY_PROGRESS, api);
    const error = (await result.catch((e: unknown) => e)) as CreateChainError;
    expect(error.step).toBe('categories');
    expect(error.cause).toBeInstanceOf(ApiError);
    expect(error.message).toBe('잠시 후 다시 시도해 주세요');
  });
});

describe('abandonCreate', () => {
  it('만든 상품이 있으면 지우고, 없으면 아무것도 하지 않는다', async () => {
    const { api, calls } = fakeApi();
    await abandonCreate(EMPTY_PROGRESS, api);
    expect(calls).toEqual([]);
    await abandonCreate({ ...EMPTY_PROGRESS, productId: '0' }, api);
    expect(calls).toEqual(['delete 0']);
  });
});
