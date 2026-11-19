import { launchImageLibraryAsync } from 'expo-image-picker';

import { presignUpload } from '@/features/uploads';
import { type PickedImage, type UploadDeps, uploadImage } from '@/shared/lib/upload';

/** 사진 한 장(자르기 없음). 취소면 null */
export async function pickChatImage(): Promise<PickedImage | null> {
  const result = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
}

/** 축소(≤1600px JPEG) → CONVERSATION_IMAGE presign(10MB) → PUT → publicUrl */
export const uploadChatImage = (image: PickedImage, deps?: UploadDeps) =>
  uploadImage('CONVERSATION_IMAGE', image, presignUpload, deps);
