import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors, shadow, tracking } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui';

import { HOME_COPY } from '../model/home';

const GRADIENT: [number, string][] = [
  [0, colors.stepDone],
  [0.4, colors.tint2],
  [0.6, colors.bg],
  [1, colors.gray2],
];

/** 히어로 배경(.hero 45deg 그라디언트). RN 스타일에는 그라디언트가 없어 SVG로 깐다 */
function HeroBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="home-hero" x1="0" y1="1" x2="1" y2="0">
          {GRADIENT.map(([offset, color]) => (
            <Stop key={offset} offset={offset} stopColor={color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" fill="url(#home-hero)" />
    </Svg>
  );
}

const sentence = 'mt-[3px] font-sans text-4xl text-text';
const sentenceStyle = { letterSpacing: tracking(22, -0.02) };

/** 오늘 남은 제작 수량. 설정이 없으면(null) 설정 화면으로 안내한다 */
export function HeroCard({ remainingCapacity }: { remainingCapacity: number | null }) {
  const router = useRouter();
  return (
    <View style={shadow.native.card} className="mx-[18px] mt-6 rounded-xl">
      <View className="overflow-hidden rounded-xl border border-line2 p-6">
        <HeroBackground />
        {remainingCapacity === null ? (
          <>
            <Text className={cn(sentence, 'mb-1')} style={sentenceStyle}>
              {HOME_COPY.capacityUnset}
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/store/daily-capacities')}
              className="mb-2 h-11 justify-center self-start"
            >
              <Text className="font-sans text-md font-medium tracking-tight text-primary-strong">
                {HOME_COPY.setCapacity}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text className={cn(sentence, 'mb-[33px]')} style={sentenceStyle}>
            <Text className="font-bold">오늘 제작 가능</Text>한{'\n'}수량은{' '}
            <Text className="font-bold text-accent">{formatCount(remainingCapacity, '개')}</Text>{' '}
            예요
          </Text>
        )}
        <Button pill title={HOME_COPY.checkOrders} onPress={() => router.navigate('/orders')} />
      </View>
    </View>
  );
}
