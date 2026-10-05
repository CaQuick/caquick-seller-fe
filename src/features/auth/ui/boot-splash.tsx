import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';

import { AUTH_COPY } from '../model/messages';
import { useSessionBootstrap } from '../model/use-session-bootstrap';
import logo from './caquick-logo.png';

/** 1초 안에 끝나는 부팅에는 점을 보여 주지 않는다 */
const DOTS_DELAY_MS = 1_000;
const DOT_STEP_MS = 400;

function LoadingDots() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [visible, setVisible] = useState(false);
  const [lit, setLit] = useState(0);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const id = setTimeout(() => setVisible(true), DOTS_DELAY_MS);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!visible || reduceMotion) return;
    const id = setInterval(() => setLit((i) => (i + 1) % 3), DOT_STEP_MS);
    return () => clearInterval(id);
  }, [visible, reduceMotion]);
  if (!visible) return null;
  return (
    <View testID="boot-dots" className="flex-row gap-2">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className={cn(
            'h-2 w-2 rounded-full',
            !reduceMotion && i === lit ? 'bg-primary' : 'bg-chip-off',
          )}
        />
      ))}
    </View>
  );
}

/** 세션 복원 동안 앱 위를 덮는 스플래시. 장애면 토큰을 남긴 채 여기서 다시 시도한다 */
export function BootSplash() {
  const { phase, retry } = useSessionBootstrap();
  if (phase === 'ready') return null;
  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityLabel="케이퀵 판매자 시작 중"
      className="items-center justify-center bg-bg"
    >
      <Image source={logo} accessibilityLabel="케이퀵" style={{ width: 124, height: 56 }} />
      <View className="absolute inset-x-0 bottom-[72px] items-center px-6">
        {phase === 'offline' ? (
          <>
            <Text
              accessibilityLiveRegion="polite"
              className="text-center font-sans text-base tracking-tight text-label"
            >
              {AUTH_COPY.offline}
            </Text>
            <Button title="다시 시도" variant="secondary" onPress={retry} className="mt-3" />
          </>
        ) : (
          <LoadingDots />
        )}
      </View>
    </View>
  );
}
