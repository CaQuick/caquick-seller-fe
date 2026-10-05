import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, type DimensionValue, View } from 'react-native';

import { colors, radius as radii } from '@/shared/config/tokens';

interface Props {
  width?: DimensionValue;
  height?: number;
  /** 아바타·썸네일용 원형 */
  round?: boolean;
  /** 기본 6(.sk). 썸네일 12·카드 16 */
  radius?: number;
  testID?: string;
}

/** 로딩 자리 표시. Animated.View는 NativeWind 대상이 아니라 style로 그린다 */
export function Skeleton({
  width = '100%',
  height = 14,
  round = false,
  radius = radii.badge,
  testID,
}: Props) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (alive && !reduce) loop.start();
    });
    return () => {
      alive = false;
      loop.stop();
    };
  }, [opacity]);
  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityLabel="불러오는 중"
      accessibilityRole="progressbar"
      style={{
        opacity,
        width,
        height,
        borderRadius: round ? radii.full : radius,
        backgroundColor: colors.track2,
      }}
    />
  );
}

/** 목록 로딩(.skeleton): 50px 썸네일 + 제목·보조 줄 행, card면 96px 카드 블록 */
export function SkeletonRows({ count = 3, card = false }: { count?: number; card?: boolean }) {
  return (
    <View accessibilityLabel="불러오는 중" className="gap-3.5 py-4">
      {Array.from({ length: count }, (_, i) =>
        card ? (
          <Skeleton key={i} height={96} radius={radii.xl} />
        ) : (
          <View key={i} className="flex-row items-center gap-3">
            <Skeleton width={50} height={50} radius={radii.lg} />
            <View className="flex-1 gap-2">
              <Skeleton width="60%" height={18} />
              <Skeleton width="40%" />
            </View>
          </View>
        ),
      )}
    </View>
  );
}
