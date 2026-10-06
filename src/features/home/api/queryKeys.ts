/** sellerDashboard(input: { date? }) — KST 날짜 생략은 오늘 */
export const homeKeys = {
  all: ['home'] as const,
  store: () => [...homeKeys.all, 'store'] as const,
  dashboard: (date?: string) => [...homeKeys.all, 'dashboard', date ?? 'today'] as const,
  recentOrders: () => [...homeKeys.all, 'recentOrders'] as const,
  recentOrdersBy: (status: string) => [...homeKeys.recentOrders(), status] as const,
};
