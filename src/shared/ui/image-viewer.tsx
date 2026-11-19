import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/shared/config/tokens';

import { Icon } from './icon';

interface Props {
  images: readonly string[];
  /** 처음 보여 줄 장. null이면 닫혀 있다 */
  index: number | null;
  onClose: () => void;
  /** 장마다 붙일 이름(윗면·앞 등) */
  labels?: readonly string[];
}

/** 전체 화면 이미지 보기. 좌우로 넘기고, 닫기·뒤로 가기로 돌아간다 */
export function ImageViewer({ images, index, onClose, labels }: Props) {
  return (
    <Modal
      visible={index !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait']}
    >
      {index === null ? null : (
        <Pages key={index} images={images} start={index} onClose={onClose} labels={labels} />
      )}
    </Modal>
  );
}

function Pages({
  images,
  start,
  onClose,
  labels,
}: {
  images: readonly string[];
  start: number;
  onClose: () => void;
  labels?: readonly string[];
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(start);
  const label = (i: number) => labels?.[i] ?? `이미지 ${i + 1}`;
  return (
    <View className="flex-1 bg-ink">
      <FlatList
        testID="image-viewer-pages"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={images}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <Image
            accessibilityLabel={label(index)}
            source={{ uri: item }}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={{ width, height }}
          />
        )}
      />
      <View
        style={{ top: insets.top + 4 }}
        className="absolute left-0 right-0 flex-row items-center justify-between pl-5 pr-2"
      >
        <Text className="font-sans text-md font-semibold text-surface">
          {`${label(page)} · ${page + 1}/${images.length}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon name="close" size={22} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  );
}
