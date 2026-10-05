import { type ReviewMediaType, type ReviewSort } from '@/graphql/generated/graphql';
import { kstParts } from '@/shared/lib/kst';

export type ReviewSortKey = ReviewSort;

export const REVIEW_COPY = {
  emptyTitle: '아직 리뷰가 없어요',
  emptyDescription: '픽업 완료 뒤 구매자가 남긴 리뷰가 여기에 모여요',
  photoEmpty: '사진 리뷰가 없어요',
  readOnly: '리뷰와 댓글은 구매자끼리 나누는 공간이라 판매자는 읽기만 할 수 있어요.',
  notFound: '삭제되었거나 볼 수 없는 리뷰예요',
  noComments: '아직 댓글이 없어요',
  withdrawn: '탈퇴한 사용자',
} as const;

export const SORT_OPTIONS: readonly { value: ReviewSortKey; label: string }[] = [
  { value: 'LATEST', label: '최신순' },
  { value: 'LIKES', label: '좋아요순' },
];

export const sortLabel = (sort: ReviewSortKey) =>
  SORT_OPTIONS.find((o) => o.value === sort)?.label ?? '';

export function reviewListInput(
  storeId: string,
  { photoOnly, sort }: { photoOnly: boolean; sort: ReviewSortKey },
  cursor: string | null,
) {
  return { storeId, photoOnly, sort, cursor, limit: 20 };
}

export interface DistributionRow {
  star: number;
  count: number;
  /** 0~1 */
  ratio: number;
}

/** 5점 → 1점 순. 소수 평점은 반올림해 1~5 칸에 넣는다 */
export function ratingDistribution(items: readonly { rating: number }[]): DistributionRow[] {
  const counts = [0, 0, 0, 0, 0];
  for (const { rating } of items) {
    const star = Math.min(5, Math.max(1, Math.round(rating)));
    counts[star - 1] = (counts[star - 1] ?? 0) + 1;
  }
  return [5, 4, 3, 2, 1].map((star) => {
    const count = counts[star - 1] ?? 0;
    return { star, count, ratio: items.length ? count / items.length : 0 };
  });
}

const p = (n: number) => String(n).padStart(2, '0');

/** 2026.10.03 (KST) */
export function formatReviewDate(iso: string): string {
  const k = kstParts(iso);
  return `${k.y}.${p(k.m)}.${p(k.d)}`;
}

export const nicknameOf = (nickname: string | null | undefined) =>
  nickname?.trim() ? nickname : REVIEW_COPY.withdrawn;

export interface ReviewMediaLike {
  mediaType: ReviewMediaType;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  sortOrder: number;
}

/** 썸네일 주소 순서대로. 대표 프레임 없는 동영상은 null(자리만 그린다) */
export function mediaThumbs(media: readonly ReviewMediaLike[]): (string | null)[] {
  return [...media]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => m.thumbnailUrl ?? (m.mediaType === 'IMAGE' ? m.mediaUrl : null));
}
