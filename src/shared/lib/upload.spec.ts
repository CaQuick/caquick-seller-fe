import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { mockFileSizes, mockUploads } from '@/test/mocks';

import {
  type PickedImage,
  type Presign,
  type PresignInput,
  targetSize,
  uploadImage,
} from './upload';

/** manipulate 체인 기록: resize 인자와 saveAsync 옵션 */
const manip = { resize: [] as unknown[], save: [] as unknown[] };
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: {
    manipulate: jest.fn(() => {
      const context: { resize: (size: unknown) => unknown; renderAsync: () => Promise<unknown> } = {
        resize: (size) => {
          manip.resize.push(size);
          return context;
        },
        renderAsync: () =>
          Promise.resolve({
            saveAsync: (options: unknown) => {
              manip.save.push(options);
              return Promise.resolve({ uri: 'file:///cache/shrunk.jpg', width: 1, height: 1 });
            },
          }),
      };
      return context;
    }),
  },
}));

const image = (width: number, height: number): PickedImage => ({
  uri: 'file:///picked.heic',
  width,
  height,
});
const presignOk = () =>
  jest.fn((_input: PresignInput) =>
    Promise.resolve({ uploadUrl: 'https://s3.test/put', publicUrl: 'https://cdn.test/a.jpg' }),
  );

describe('targetSize', () => {
  it.each([
    [1600, 1200, null],
    [800, 600, null],
    [3200, 2400, { width: 1600 }],
    [2400, 3200, { height: 1600 }],
    [1601, 1601, { width: 1600 }],
  ])('%d×%d → %p', (w, h, expected) => {
    expect(targetSize(image(w, h))).toEqual(expected);
  });
});

describe('uploadImage', () => {
  beforeEach(() => {
    manip.resize = [];
    manip.save = [];
    jest.mocked(ImageManipulator.manipulate).mockClear();
  });

  it('축소(JPEG 0.85) → 축소 파일 크기로 presign → PUT BINARY_CONTENT → publicUrl', async () => {
    mockFileSizes.set('file:///cache/shrunk.jpg', 1234);
    const presign = presignOk();
    await expect(uploadImage('PRODUCT_IMAGE', image(4000, 3000), presign)).resolves.toBe(
      'https://cdn.test/a.jpg',
    );
    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///picked.heic');
    expect(manip.resize).toEqual([{ width: 1600 }]);
    expect(manip.save).toEqual([{ format: SaveFormat.JPEG, compress: 0.85 }]);
    expect(presign).toHaveBeenCalledWith({
      purpose: 'PRODUCT_IMAGE',
      contentType: 'image/jpeg',
      contentLength: 1234,
    });
    expect(mockUploads).toEqual([
      {
        uri: 'file:///cache/shrunk.jpg',
        url: 'https://s3.test/put',
        options: {
          httpMethod: 'PUT',
          uploadType: 0,
          headers: { 'Content-Type': 'image/jpeg' },
        },
      },
    ]);
  });

  it('작은 이미지는 resize 없이 JPEG로만 다시 저장한다', async () => {
    mockFileSizes.set('file:///cache/shrunk.jpg', 10);
    await uploadImage('STORE_IMAGE', image(1000, 500), presignOk());
    expect(manip.resize).toEqual([]);
    expect(manip.save).toHaveLength(1);
  });

  it('반증: presign은 원본이 아니라 축소된 파일 크기로 요청한다', async () => {
    mockFileSizes.set('file:///picked.heic', 9_000_000);
    mockFileSizes.set('file:///cache/shrunk.jpg', 777);
    const presign = presignOk();
    await uploadImage('PRODUCT_IMAGE', image(5000, 5000), presign);
    expect(presign.mock.calls[0]![0]).toMatchObject({ contentLength: 777 });
  });

  it.each([
    ['빈 파일', 0, '빈 파일입니다.'],
    ['5MB 초과', 5 * 1024 * 1024 + 1, '5MB 이하만 올릴 수 있습니다.'],
  ])('%s은 presign 전에 BAD_USER_INPUT', async (_, size, message) => {
    mockFileSizes.set('file:///cache/shrunk.jpg', size);
    const presign = presignOk();
    await expect(uploadImage('PRODUCT_IMAGE', image(100, 100), presign)).rejects.toMatchObject({
      classification: 'BAD_USER_INPUT',
      message,
    });
    expect(presign).not.toHaveBeenCalled();
    expect(mockUploads).toEqual([]);
  });

  it('PUT 실패·네트워크 오류는 ApiError', async () => {
    const deps = (upload: () => Promise<{ status: number }>) => ({
      shrink: () => Promise.resolve('file:///x.jpg'),
      createFile: () => ({ size: 10, upload }),
    });
    await expect(
      uploadImage(
        'PRODUCT_IMAGE',
        image(1, 1),
        presignOk(),
        deps(() => Promise.resolve({ status: 403 })),
      ),
    ).rejects.toMatchObject({ status: 403, classification: 'INTERNAL_SERVER_ERROR' });
    await expect(
      uploadImage(
        'PRODUCT_IMAGE',
        image(1, 1),
        presignOk(),
        deps(() => Promise.reject(new Error('net'))),
      ),
    ).rejects.toMatchObject({ classification: 'NETWORK' });
  });

  it('presign 실패는 그대로 올라가고 PUT하지 않는다', async () => {
    mockFileSizes.set('file:///cache/shrunk.jpg', 10);
    const presign: Presign = () => Promise.reject(new Error('presign'));
    await expect(uploadImage('PRODUCT_IMAGE', image(1, 1), presign)).rejects.toThrow('presign');
    expect(mockUploads).toEqual([]);
  });
});
