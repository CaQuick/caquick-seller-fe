import { useRef, useState } from 'react';
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { cn } from '@/shared/lib/cn';

interface Props {
  urls: readonly string[];
}

/** 대표 캐러셀(.products-hero 1:1 r16) + 썸네일 스트립(56 r8, 가로 스크롤). 썸네일을 누르면 그 장으로 넘긴다 */
export function DetailGallery({ urls }: Props) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const hero = useRef<ScrollView>(null);

  if (urls.length === 0) {
    return (
      <View className="mt-4 aspect-square items-center justify-center rounded-xl bg-gray2">
        <Text className="font-sans text-base tracking-tight text-muted">
          등록한 이미지가 없어요
        </Text>
      </View>
    );
  }

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };
  const select = (i: number) => {
    setIndex(i);
    hero.current?.scrollTo({ x: i * width, animated: true });
  };

  return (
    <View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        className="mt-4 aspect-square overflow-hidden rounded-xl bg-gray2"
      >
        <ScrollView
          ref={hero}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
        >
          {urls.map((uri, i) => (
            <Image
              key={`${i}-${uri}`}
              accessibilityLabel={`상품 이미지 ${i + 1}/${urls.length}`}
              source={{ uri }}
              style={{ width, height: width }}
            />
          ))}
        </ScrollView>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-2"
        contentContainerClassName="gap-1.5"
      >
        {urls.map((uri, i) => (
          <Pressable
            key={`${i}-${uri}`}
            accessibilityRole="button"
            accessibilityLabel={`${i + 1}번째 이미지 보기`}
            accessibilityState={{ selected: i === index }}
            onPress={() => select(i)}
            className={cn(
              'h-14 w-14 overflow-hidden rounded-sm bg-gray2',
              i === index && 'border-2 border-primary',
            )}
          >
            <Image source={{ uri }} className="h-full w-full" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
