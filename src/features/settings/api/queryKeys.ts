export const settingsKeys = {
  all: ['settings'] as const,
  store: () => [...settingsKeys.all, 'store'] as const,
};
