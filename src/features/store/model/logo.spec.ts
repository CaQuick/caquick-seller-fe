import { launchImageLibraryAsync } from 'expo-image-picker';
import { HttpResponse, graphql } from 'msw';

import { type UploadDeps } from '@/shared/lib/upload';
import { mockFileSizes, mockUploads } from '@/test/mocks';
import { graphqlError } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import { pickLogo, uploadLogo } from './logo';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const image = { uri: 'file:///picked.heic', width: 3000, height: 3000 };
const SHRUNK = 'file:///cache/logo.jpg';

/** 축소는 upload.spec이 본다 — 여기서는 체인 순서와 STORE_IMAGE만 */
const deps = (upload?: () => Promise<{ status: number }>): UploadDeps => ({
  shrink: () => Promise.resolve(SHRUNK),
  createFile: (uri) => ({
    size: mockFileSizes.get(uri) ?? 0,
    upload: async (url) => {
      mockUploads.push({ uri, url, options: null });
      return upload ? upload() : { status: 200 };
    },
  }),
});

function presign(respond: 'ok' | 'fail' = 'ok') {
  const calls: unknown[] = [];
  server.use(
    graphql.mutation('SellerStoreCreateUploadUrl', ({ variables }) => {
      calls.push(variables.input);
      return respond === 'ok'
        ? HttpResponse.json({
            data: {
              sellerCreateUploadUrl: {
                uploadUrl: 'https://s3.test/put',
                publicUrl: 'https://cdn.test/logo.jpg',
              },
            },
          })
        : HttpResponse.json({
            data: null,
            errors: [
              graphqlError({
                message: '업로드 주소를 만들 수 없습니다.',
                code: 'S3_PRESIGN_FAILED',
                classification: 'INTERNAL_SERVER_ERROR',
                statusCode: 503,
              }),
            ],
          });
    }),
  );
  return calls;
}

describe('uploadLogo', () => {
  beforeEach(() => mockFileSizes.set(SHRUNK, 2048));

  it('축소한 파일 크기로 STORE_IMAGE를 발급받아 PUT하고 publicUrl을 돌려준다', async () => {
    const calls = presign();
    await expect(uploadLogo(image, deps())).resolves.toBe('https://cdn.test/logo.jpg');
    expect(calls).toEqual([
      { purpose: 'STORE_IMAGE', contentType: 'image/jpeg', contentLength: 2048 },
    ]);
    expect(mockUploads).toEqual([{ uri: SHRUNK, url: 'https://s3.test/put', options: null }]);
  });

  it('발급이 실패하면 올리지 않고 서버 오류를 그대로 던진다', async () => {
    presign('fail');
    await expect(uploadLogo(image, deps())).rejects.toMatchObject({
      code: 'S3_PRESIGN_FAILED',
      message: '업로드 주소를 만들 수 없습니다.',
    });
    expect(mockUploads).toHaveLength(0);
  });

  it.each([
    ['스토리지가 5xx', () => Promise.resolve({ status: 500 }), { status: 500 }],
    ['연결 실패', () => Promise.reject(new Error('offline')), { classification: 'NETWORK' }],
  ])('PUT이 %s면 publicUrl을 돌려주지 않는다', async (_, upload, expected) => {
    presign();
    await expect(uploadLogo(image, deps(upload))).rejects.toMatchObject(expected);
  });
});

describe('pickLogo', () => {
  it('정사각 편집으로 한 장 고른다', async () => {
    jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', width: 800, height: 800 }],
    } as never);
    await expect(pickLogo()).resolves.toEqual({ uri: 'file:///a.jpg', width: 800, height: 800 });
    expect(launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }),
    );
  });

  it('취소하면 null', async () => {
    jest
      .mocked(launchImageLibraryAsync)
      .mockResolvedValueOnce({ canceled: true, assets: null } as never);
    await expect(pickLogo()).resolves.toBeNull();
  });
});
