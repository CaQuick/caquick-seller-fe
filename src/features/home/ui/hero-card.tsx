import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { gradient, shadow, tracking } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui';

import { cssGradientLine } from '../model/gradient';
import { HOME_COPY } from '../model/home';

/** 히어로 배경(.hero). 각도를 실제 픽셀로 맞추려고 카드 크기를 재서 userSpace 좌표로 그린다 */
function HeroBackground() {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const { angle, stops } = gradient.hero;
  return (
    <View
      testID="hero-background"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox(e.nativeEvent.layout)}
    >
      {box && (
        <Svg width={box.width} height={box.height}>
          <Defs>
            <LinearGradient
              id="home-hero"
              gradientUnits="userSpaceOnUse"
              {...cssGradientLine(angle, box.width, box.height)}
            >
              {stops.map(([offset, color]) => (
                <Stop key={offset} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect width={box.width} height={box.height} fill="url(#home-hero)" />
        </Svg>
      )}
    </View>
  );
}

const sentence = 'mt-[3px] font-sans text-4xl text-text';
const sentenceStyle = { letterSpacing: tracking(22, -0.02) };

/**
 * 오늘 남은 제작 수량. 설정이 없으면(null) 설정 화면으로 안내한다.
 * 입금 대기 주문은 판매자에게 보이지 않지만 수량을 차지해 그 몫을 따로 적는다(수량만)
 */
export function HeroCard({
  remainingCapacity,
  pendingPaymentQuantity = 0,
}: {
  remainingCapacity: number | null;
  pendingPaymentQuantity?: number;
}) {
  const router = useRouter();
  return (
    <View testID="hero" style={shadow.native.hero} className="mx-[18px] mt-6 rounded-xl bg-surface">
      <View className="overflow-hidden rounded-xl border border-line2 p-6">
        <HeroBackground />
        {remainingCapacity === null ? (
          <>
            <Text className={cn(sentence, 'mb-1')} style={sentenceStyle}>
              오늘 <Text className="font-bold">생산 수량</Text>을{'\n'}설정해 주세요
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
          <>
            <Text
              className={cn(sentence, pendingPaymentQuantity > 0 ? 'mb-1.5' : 'mb-[33px]')}
              style={sentenceStyle}
            >
              <Text className="font-bold">오늘 제작 가능</Text>한{'\n'}수량은{' '}
              <Text className="font-bold text-accent">{formatCount(remainingCapacity, '개')}</Text>{' '}
              예요
            </Text>
            {pendingPaymentQuantity > 0 ? (
              <Text className="mb-[19px] font-sans text-sm tracking-tight text-sublabel">
                {HOME_COPY.pendingPayment(pendingPaymentQuantity)}
              </Text>
            ) : null}
          </>
        )}
        <Button pill title={HOME_COPY.checkOrders} onPress={() => router.navigate('/orders')} />
      </View>
    </View>
  );
}
