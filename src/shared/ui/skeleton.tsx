import { useEffect, useState } from 'react';
import { Animated, type DimensionValue } from 'react-native';

import { colors, radius } from '@/shared/config/tokens';

interface Props {
  width?: DimensionValue;
  height?: number;
  /** 아바타·썸네일용 원형 */
  round?: boolean;
  testID?: string;
}

/** 로딩 자리 표시. Animated.View는 NativeWind 대상이 아니라 style로 그린다 */
export function Skeleton({ width = '100%', height = 16, round = false, testID }: Props) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
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
        borderRadius: round ? radius.full : radius.sm,
        backgroundColor: colors.gray2,
      }}
    />
  );
}
