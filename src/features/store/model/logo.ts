import { launchImageLibraryAsync } from 'expo-image-picker';

import { type PickedImage, type UploadDeps, uploadImage } from '@/shared/lib/upload';

import { presignStoreImage } from '../api/my-store';

/** 정사각 크롭으로 한 장. 취소면 null */
export async function pickLogo(): Promise<PickedImage | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
}

/** 축소 → STORE_IMAGE presign → PUT → publicUrl. 저장은 기본 정보 저장 때 같이 한다 */
export function uploadLogo(image: PickedImage, deps?: UploadDeps): Promise<string> {
  return uploadImage('STORE_IMAGE', image, presignStoreImage, deps);
}
