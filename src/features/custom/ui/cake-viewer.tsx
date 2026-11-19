import { Component, type ComponentType, lazy, type ReactNode, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/shared/config/tokens';

import type { CakeViewerProps } from './three/cake-viewer';

// three·expo-gl은 이 화면을 처음 그릴 때 평가한다. require는 부르는 순간 평가돼 import()처럼 늦춰진다
const ThreeViewer = lazy(() =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Promise.resolve(require('./three/cake-viewer') as { default: ComponentType<CakeViewerProps> }),
);

/** 캔버스 안의 오류(GL 컨텍스트 실패 등)는 밖으로 던져진다 — 알리고 아무것도 그리지 않는다 */
class GlBoundary extends Component<
  { onError: (error: unknown) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function CakeViewer(props: CakeViewerProps) {
  return (
    <GlBoundary onError={props.onError}>
      <Suspense
        fallback={
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.primaryStrong} />
          </View>
        }
      >
        <ThreeViewer {...props} />
      </Suspense>
    </GlBoundary>
  );
}
