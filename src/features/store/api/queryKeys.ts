export const storeKeys = {
  all: ['store'] as const,
  me: () => [...storeKeys.all, 'me'] as const,
  myStore: () => [...storeKeys.all, 'myStore'] as const,
  businessHours: () => [...storeKeys.all, 'businessHours'] as const,
  specialClosures: () => [...storeKeys.all, 'specialClosures'] as const,
  dailyCapacities: (month: string) => [...storeKeys.all, 'dailyCapacities', month] as const,
  faqTopics: () => [...storeKeys.all, 'faqTopics'] as const,
  auditLogs: (targetType?: string) => [...storeKeys.all, 'auditLogs', targetType ?? 'all'] as const,
  preview: (storeId: string) => [...storeKeys.all, 'preview', storeId] as const,
  previewProducts: (storeId: string, categoryId: string | null) =>
    [...storeKeys.preview(storeId), 'products', categoryId ?? 'all'] as const,
  previewProduct: (productId: string) => [...storeKeys.all, 'previewProduct', productId] as const,
  rating: (storeId: string) => [...storeKeys.all, 'rating', storeId] as const,
  pickupCalendar: (storeId: string, month: string) =>
    [...storeKeys.all, 'pickupCalendar', storeId, month] as const,
  pickupSlots: (storeId: string, date: string) =>
    [...storeKeys.all, 'pickupSlots', storeId, date] as const,
  regionGroups: () => [...storeKeys.all, 'regionGroups'] as const,
  regions: (parentId: string) => [...storeKeys.all, 'regions', parentId] as const,
  regionSearch: (keyword: string) => [...storeKeys.all, 'regionSearch', keyword] as const,
};
