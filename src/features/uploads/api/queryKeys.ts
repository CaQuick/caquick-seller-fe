export type UploadPurpose = 'PRODUCT_IMAGE' | 'STORE_IMAGE';

/** 업로드는 presign mutation뿐이라 캐시 키는 mutationKey 용도 */
export const uploadsKeys = {
  all: ['uploads'] as const,
  presign: (purpose: UploadPurpose) => [...uploadsKeys.all, 'presign', purpose] as const,
};
