export const settingsKeys = {
  all: ['settings'] as const,
  me: () => [...settingsKeys.all, 'me'] as const,
  pushPermission: () => [...settingsKeys.all, 'pushPermission'] as const,
};
