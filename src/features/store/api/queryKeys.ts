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
};
