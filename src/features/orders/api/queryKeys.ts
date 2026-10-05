export interface OrderListFilter {
  status?: string;
  search?: string;
  pickupFrom?: string;
  pickupTo?: string;
}

export const ordersKeys = {
  all: ['orders'] as const,
  list: (filter: OrderListFilter) => [...ordersKeys.all, 'list', filter] as const,
  detail: (id: string) => [...ordersKeys.all, 'detail', id] as const,
};
