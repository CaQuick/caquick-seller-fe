import { launchImageLibraryAsync } from 'expo-image-picker';
import { HttpResponse, graphql } from 'msw';

import { type UploadDeps } from '@/shared/lib/upload';
import { mockFileSizes, mockUploads } from '@/test/mocks';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { pickImages, uploadDraftImage } from './draft-images';
import { useDraftStore } from './draft-store';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const SHRUNK = 'file:///cache/p.jpg';
const deps: UploadDeps = {
  shrink: () => Promise.resolve(SHRUNK),
  createFile: (uri) => ({
    size: mockFileSizes.get(uri) ?? 0,
    upload: (url) => {
      mockUploads.push({ uri, url, options: null });
      return Promise.resolve({ status: 200 });
    },
  }),
};

function presign(fail = false) {
  const calls: unknown[] = [];
  server.use(
    graphql.mutation('SellerUploadsCreateUploadUrl', ({ variables }) => {
      calls.push(variables.input);
      return fail
        ? HttpResponse.json({
            data: null,
            errors: [
              graphqlError({
                message: '업로드 주소를 만들 수 없습니다.',
                code: 'S3_PRESIGN_FAILED',
                classification: 'INTERNAL_SERVER_ERROR',
                statusCode: 503,
              }),
            ],
          })
        : HttpResponse.json({
            data: {
              sellerCreateUploadUrl: {
                uploadUrl: 'https://s3/put',
                publicUrl: 'https://cdn/p.jpg',
              },
            },
          });
    }),
  );
  return calls;
}

beforeEach(() => {
  useDraftStore.getState().reset();
  mockFileSizes.set(SHRUNK, 4096);
});

describe('pickImages', () => {
  it('남은 장수만큼 여러 장을 고르게 하고 고른 순서대로 돌려준다', async () => {
    jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [1, 2, 3].map((n) => ({ uri: `file:///${n}.jpg`, width: 10, height: 20 })),
    } as never);
    await expect(pickImages(2)).resolves.toEqual([
      { uri: 'file:///1.jpg', width: 10, height: 20 },
      { uri: 'file:///2.jpg', width: 10, height: 20 },
    ]);
    expect(launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 2 }),
    );
  });

  it('취소하면 빈 배열', async () => {
    jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({ canceled: true } as never);
    await expect(pickImages(1)).resolves.toEqual([]);
  });
});

describe('uploadDraftImage', () => {
  const add = () =>
    useDraftStore.getState().addImages([{ uri: 'file:///a.heic', width: 3000, height: 2000 }])[0]!;
  const image = (key: string) => useDraftStore.getState().draft.images.find((i) => i.key === key);

  it('PRODUCT_IMAGE로 올리고 publicUrl을 초안에 남긴다', async () => {
    const calls = presign();
    const { key } = add();
    await expect(uploadDraftImage(key, deps)).resolves.toBeNull();
    expect(calls).toEqual([
      { purpose: 'PRODUCT_IMAGE', contentType: 'image/jpeg', contentLength: 4096 },
    ]);
    expect(image(key)).toMatchObject({ status: 'done', publicUrl: 'https://cdn/p.jpg' });
  });

  it('실패하면 failed로 두고 원인을 돌려주며, 다시 부르면 같은 원본으로 올린다', async () => {
    presign(true);
    const { key } = add();
    const error = await uploadDraftImage(key, deps);
    expect(error).toMatchObject({ code: 'S3_PRESIGN_FAILED' });
    expect(image(key)).toMatchObject({ status: 'failed', publicUrl: null });

    presign();
    await uploadDraftImage(key, deps);
    expect(image(key)).toMatchObject({ status: 'done', publicUrl: 'https://cdn/p.jpg' });
  });

  it('올리는 사이 지운 이미지는 되살리지 않는다', async () => {
    presign();
    const { key } = add();
    const pending = uploadDraftImage(key, deps);
    useDraftStore.getState().removeImage(key);
    await pending;
    expect(useDraftStore.getState().draft.images).toEqual([]);
  });

  it('원본이 없는(복원한) 이미지는 다시 올리지 않는다', async () => {
    useDraftStore.getState().restore({
      ...useDraftStore.getState().draft,
      images: [
        {
          key: 'r',
          uri: 'https://cdn/r.jpg',
          source: null,
          publicUrl: 'https://cdn/r.jpg',
          status: 'done',
        },
      ],
    });
    await expect(uploadDraftImage('r', deps)).resolves.toBeNull();
    expect(mockUploads).toEqual([]);
  });
});
