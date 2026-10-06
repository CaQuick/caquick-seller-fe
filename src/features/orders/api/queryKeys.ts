/** 목록 필터 = sellerOrderList input에서 커서·limit을 뺀 값. 날짜는 UTC ISO */
export interface OrderListFilter {
  status?: string;
  search?: string;
  fromPickupAt?: string;
  toPickupAt?: string;
  fromCreatedAt?: string;
  toCreatedAt?: string;
}

export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (filter: OrderListFilter) => [...ordersKeys.lists(), filter] as const,
  detail: (id: string) => [...ordersKeys.all, 'detail', id] as const,
  conversation: (accountId: string) => [...ordersKeys.all, 'conversation', accountId] as const,
};
