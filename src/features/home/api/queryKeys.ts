/** sellerDashboard(input: { date? }) — KST 날짜 생략은 오늘 */
export const homeKeys = {
  all: ['home'] as const,
  dashboard: (date?: string) => [...homeKeys.all, 'dashboard', date ?? 'today'] as const,
};
