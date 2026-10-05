import { File, type UploadOptions, UploadType } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { ApiError } from '@/shared/api/errors';

/** schema.graphql의 UploadPurpose. codegen은 문서가 쓰는 타입만 내놓아 여기 적는다 */
export type UploadPurpose = 'PRODUCT_IMAGE' | 'STORE_IMAGE' | 'BANNER_IMAGE';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.85;
const MAX_BYTES = 5 * 1024 * 1024;
const CONTENT_TYPE = 'image/jpeg';

export interface PresignInput {
  purpose: UploadPurpose;
  contentType: typeof CONTENT_TYPE;
  contentLength: number;
}
/** sellerCreateUploadUrl 호출은 feature가 넣는다 — shared는 GraphQL 문서를 갖지 않는다 */
export type Presign = (input: PresignInput) => Promise<{ uploadUrl: string; publicUrl: string }>;

interface UploadFile {
  size: number | null;
  upload(url: string, options?: UploadOptions): Promise<{ status: number }>;
}

/** expo 모듈 경계 — 테스트·다른 압축 전략은 여기만 바꾼다 */
export interface UploadDeps {
  /** 긴 변 ≤1600px·JPEG 0.85로 다시 저장한 파일의 uri */
  shrink: (image: PickedImage) => Promise<string>;
  createFile: (uri: string) => UploadFile;
}

/** 긴 변 기준 축소 치수. 이미 작으면 null(비율 유지는 manipulator가 한다). */
export function targetSize({
  width,
  height,
}: PickedImage): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= MAX_EDGE) return null;
  return width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE };
}

async function shrinkWithExpo(image: PickedImage): Promise<string> {
  const context = ImageManipulator.manipulate(image.uri);
  const size = targetSize(image);
  if (size) context.resize(size);
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return saved.uri;
}

const DEFAULT_DEPS: UploadDeps = {
  shrink: shrinkWithExpo,
  createFile: (uri) => new File(uri),
};

/**
 * 축소 → 파일 크기 → presign → PUT → publicUrl.
 * presign의 contentLength·contentType이 서명에 들어가므로 축소를 먼저 하고 축소된 파일의 크기로 발급받는다.
 */
export async function uploadImage(
  purpose: UploadPurpose,
  image: PickedImage,
  presign: Presign,
  deps: UploadDeps = DEFAULT_DEPS,
): Promise<string> {
  const uri = await deps.shrink(image);
  const file = deps.createFile(uri);
  const size = file.size ?? 0;
  if (size < 1) throw new ApiError('빈 파일입니다.', 'BAD_USER_INPUT', null, 400);
  if (size > MAX_BYTES)
    throw new ApiError('5MB 이하만 올릴 수 있습니다.', 'BAD_USER_INPUT', null, 400);
  const { uploadUrl, publicUrl } = await presign({
    purpose,
    contentType: CONTENT_TYPE,
    contentLength: size,
  });
  let res: { status: number };
  try {
    res = await file.upload(uploadUrl, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers: { 'Content-Type': CONTENT_TYPE },
    });
  } catch {
    throw new ApiError('스토리지에 연결할 수 없습니다.', 'NETWORK', null, 0);
  }
  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(
      `이미지 업로드 실패 (${res.status})`,
      'INTERNAL_SERVER_ERROR',
      null,
      res.status,
    );
  }
  return publicUrl;
}
