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

/** 가운데 정사각 영역. 편집기의 1:1 자르기는 플랫폼마다 1px씩 어긋날 수 있어 한 번 더 자른다 */
export function squareCropRect({ width, height }: { width: number; height: number }) {
  const side = Math.min(width, height);
  return {
    originX: Math.floor((width - side) / 2),
    originY: Math.floor((height - side) / 2),
    width: side,
    height: side,
  };
}

/** 슬롯형 바탕은 정사각만 받는다(서버가 가로·세로를 검사). 취소면 null */
export async function pickSquareImage(): Promise<PickedImage | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height, crop: squareCropRect(asset) };
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
