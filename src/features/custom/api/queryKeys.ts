export const customKeys = {
  all: ['custom'] as const,
  catalog: () => [...customKeys.all, 'catalog'] as const,
};
