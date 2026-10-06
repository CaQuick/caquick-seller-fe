export interface ProductListFilter {
  isActive?: boolean;
  categoryId?: string;
  search?: string;
}

export const productsKeys = {
  all: ['products'] as const,
  lists: () => [...productsKeys.all, 'list'] as const,
  list: (filter: ProductListFilter) => [...productsKeys.all, 'list', filter] as const,
  detail: (id: string) => [...productsKeys.all, 'detail', id] as const,
  categories: () => [...productsKeys.all, 'categories'] as const,
  tagSearch: (keyword: string) => [...productsKeys.all, 'tags', keyword] as const,
  buyerPreview: (id: string) => [...productsKeys.detail(id), 'buyer'] as const,
  manage: (id: string) => [...productsKeys.detail(id), 'manage'] as const,
};
