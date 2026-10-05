import { launchImageLibraryAsync } from 'expo-image-picker';

import { presignUpload } from '@/features/uploads';
import { type PickedImage, type UploadDeps, uploadImage } from '@/shared/lib/upload';

import { useDraftStore } from './draft-store';

/** 여러 장을 고른 순서대로. 취소면 빈 배열 */
export async function pickImages(limit: number): Promise<PickedImage[]> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets
    .slice(0, limit)
    .map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

export function uploadProductImage(image: PickedImage, deps?: UploadDeps): Promise<string> {
  return uploadImage('PRODUCT_IMAGE', image, presignUpload, deps);
}

/** 업로드 결과를 초안에 반영하고 실패 원인을 돌려준다. 그사이 지운 이미지는 건드리지 않는다 */
export async function uploadDraftImage(key: string, deps?: UploadDeps): Promise<unknown> {
  const store = useDraftStore.getState();
  const image = store.draft.images.find((img) => img.key === key);
  if (!image?.source) return null;
  store.updateImage(key, { status: 'uploading' });
  try {
    const publicUrl = await uploadProductImage(image.source, deps);
    useDraftStore.getState().updateImage(key, { publicUrl, status: 'done' });
    return null;
  } catch (e) {
    useDraftStore.getState().updateImage(key, { status: 'failed' });
    return e;
  }
}
