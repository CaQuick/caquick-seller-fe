import { z } from 'zod';

import {
  type SellerUpdateStoreBasicInfoInput,
  type StoreMapProvider,
} from '@/graphql/generated/graphql';

/** BE store-field-limits와 같은 상한 */
export const basicInfoSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(1, '매장명을 입력해 주세요.')
    .max(200, '매장명은 200자 이하입니다.'),
  storePhone: z
    .string()
    .trim()
    .min(1, '전화번호를 입력해 주세요.')
    .max(30, '전화번호는 30자 이하입니다.'),
  addressFull: z
    .string()
    .trim()
    .min(1, '상세 주소를 입력해 주세요.')
    .max(500, '주소는 500자 이하입니다.'),
  websiteUrl: z.string().trim().max(2048, '웹사이트 주소가 너무 깁니다.'),
  businessHoursText: z.string().trim().max(500, '안내 문구는 500자 이하입니다.'),
  greetingMessage: z.string().trim().max(500, '인사말은 500자 이하입니다.'),
  mapProvider: z.enum(['NAVER', 'KAKAO', 'NONE']),
  region: z.object({
    city: z.string().nullable(),
    district: z.string().nullable(),
    neighborhood: z.string().nullable(),
  }),
  profileImageUrl: z.string().nullable(),
});

export type BasicInfoValues = z.input<typeof basicInfoSchema>;

interface StoreBasicInfo {
  storeName: string;
  storePhone: string;
  addressFull: string;
  addressCity?: string | null;
  addressDistrict?: string | null;
  addressNeighborhood?: string | null;
  mapProvider: StoreMapProvider;
  websiteUrl?: string | null;
  businessHoursText?: string | null;
  greetingMessage?: string | null;
  profileImageUrl?: string | null;
}

export function toBasicInfoValues(store: StoreBasicInfo): BasicInfoValues {
  return {
    storeName: store.storeName,
    storePhone: store.storePhone,
    addressFull: store.addressFull,
    websiteUrl: store.websiteUrl ?? '',
    businessHoursText: store.businessHoursText ?? '',
    greetingMessage: store.greetingMessage ?? '',
    mapProvider: store.mapProvider,
    region: {
      city: store.addressCity ?? null,
      district: store.addressDistrict ?? null,
      neighborhood: store.addressNeighborhood ?? null,
    },
    profileImageUrl: store.profileImageUrl ?? null,
  };
}

export function regionLabel(region: BasicInfoValues['region']): string | null {
  return [region.city, region.district, region.neighborhood].filter(Boolean).join(' ') || null;
}

const TEXT_FIELDS = [
  'storeName',
  'storePhone',
  'addressFull',
  'websiteUrl',
  'businessHoursText',
  'greetingMessage',
] as const;

/**
 * 바뀐 필드만 담는다(BE 부분 수정). 빈 문자열은 그대로 보내 BE가 null로 지운다 — 인사말은 기본 문구로 돌아간다.
 * 지역을 바꾸면 이전 지역의 동 이름이 남지 않게 함께 비운다.
 */
export function buildBasicInfoPatch(
  initial: BasicInfoValues,
  values: BasicInfoValues,
): SellerUpdateStoreBasicInfoInput {
  const patch: SellerUpdateStoreBasicInfoInput = {};
  for (const key of TEXT_FIELDS) {
    const next = values[key].trim();
    if (next !== initial[key].trim()) patch[key] = next;
  }
  if (values.mapProvider !== initial.mapProvider) patch.mapProvider = values.mapProvider;
  const { city, district } = values.region;
  if (city !== initial.region.city || district !== initial.region.district) {
    patch.addressCity = city;
    patch.addressDistrict = district;
    patch.addressNeighborhood = null;
  }
  if (values.profileImageUrl !== initial.profileImageUrl) {
    patch.profileImageUrl = values.profileImageUrl;
  }
  return patch;
}

/** 지역 선택 결과 → 주소 단위. 2차(시군구)만 고를 수 있다 */
export function regionFromPick(pick: { parentName?: string | null; name: string }) {
  return { city: pick.parentName ?? null, district: pick.name, neighborhood: null };
}
