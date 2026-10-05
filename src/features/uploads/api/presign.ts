import { graphql } from '@/graphql/generated';
import { gqlRequest } from '@/shared/api';
import { type Presign } from '@/shared/lib/upload';

const SellerUploadsCreateUploadUrlDocument = graphql(`
  mutation SellerUploadsCreateUploadUrl($input: SellerCreateUploadUrlInput!) {
    sellerCreateUploadUrl(input: $input) {
      uploadUrl
      publicUrl
    }
  }
`);

/** shared/lib/upload의 presign 자리에 넣는다. 용도(purpose)는 호출자가 정한다 */
export const presignUpload: Presign = async (input) =>
  (await gqlRequest(SellerUploadsCreateUploadUrlDocument, { input })).sellerCreateUploadUrl;
