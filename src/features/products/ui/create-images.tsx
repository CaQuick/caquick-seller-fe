import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { messageFor } from '@/shared/api';
import { colors } from '@/shared/config/tokens';
import { Icon, ImageDropzone, showToast } from '@/shared/ui';

import { MAX_IMAGES } from '../model/draft-form';
import { pickImages, uploadDraftImage } from '../model/draft-images';
import { type DraftImage, useDraftStore } from '../model/draft-store';

async function upload(key: string) {
  const error = await uploadDraftImage(key);
  if (error) showToast.error(messageFor(error));
}

/** 드롭존(.drop) + 썸네일(.thumb 82 r14). 고르는 즉시 올리고, 실패한 장은 눌러 다시 올린다 */
export function CreateImages({ error }: { error?: string }) {
  const images = useDraftStore((s) => s.draft.images);
  const remove = useDraftStore((s) => s.removeImage);

  const add = async () => {
    const picked = await pickImages(MAX_IMAGES - useDraftStore.getState().draft.images.length);
    const added = useDraftStore.getState().addImages(picked);
    await Promise.all(added.map((img) => upload(img.key)));
  };

  return (
    <View>
      <Text className="mb-[18px] mt-[38px] font-sans text-2xl font-semibold tracking-tight text-ink">
        상품 이미지
      </Text>
      <ImageDropzone count={images.length} max={MAX_IMAGES} onPress={() => void add()} />
      {images.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerClassName="gap-2.5"
        >
          {images.map((img, i) => (
            <Thumb
              key={img.key}
              image={img}
              label={`상품 이미지 ${i + 1}`}
              onRemove={() => remove(img.key)}
            />
          ))}
        </ScrollView>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-1.5 font-sans text-xs text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Thumb({
  image,
  label,
  onRemove,
}: {
  image: DraftImage;
  label: string;
  onRemove: () => void;
}) {
  return (
    <View className="h-[82px] w-[82px] overflow-hidden rounded-thumb bg-gray2">
      <Image accessibilityLabel={label} source={{ uri: image.uri }} className="h-full w-full" />
      {image.status === 'uploading' ? (
        <View
          accessibilityLabel={`${label} 올리는 중`}
          className="absolute inset-0 items-center justify-center bg-dim"
        >
          <ActivityIndicator color={colors.surface} />
        </View>
      ) : null}
      {image.status === 'failed' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 다시 올리기`}
          onPress={() => void upload(image.key)}
          className="absolute inset-0 items-center justify-center gap-1 bg-dim"
        >
          <Icon name="retry" size={20} color={colors.surface} />
          <Text className="font-sans text-xs font-medium text-surface">다시 시도</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 삭제`}
        onPress={onRemove}
        hitSlop={10}
        className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center"
      >
        <Text className="font-sans text-3xl leading-[22px] text-surface">×</Text>
      </Pressable>
    </View>
  );
}
