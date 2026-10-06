import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import { type ReactElement, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * 앱 루트와 같은 Provider 묶음. QueryClient는 spec마다 새로 만들고 재시도는 끈다.
 * gcTime 0: 캐시 gc 타이머(기본 5분)가 남으면 단일 spec 실행에서 jest가 끝나지 않는다
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

export function Providers({
  children,
  queryClient = createTestQueryClient(),
}: {
  children: ReactNode;
  queryClient?: QueryClient;
}) {
  return (
    <GestureHandlerRootView>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient, ...options }: RenderOptions & { queryClient?: QueryClient } = {},
) {
  return render(ui, {
    wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
    ...options,
  });
}
