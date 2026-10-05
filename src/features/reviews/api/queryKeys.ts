export interface ReviewListFilter {
  storeId?: string;
  photoOnly?: boolean;
  sort?: string;
}

export const reviewsKeys = {
  all: ['reviews'] as const,
  list: (filter: ReviewListFilter) => [...reviewsKeys.all, 'list', filter] as const,
  detail: (id: string) => [...reviewsKeys.all, 'detail', id] as const,
  comments: (id: string) => [...reviewsKeys.all, 'comments', id] as const,
};
