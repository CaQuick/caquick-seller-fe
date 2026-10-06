import { Image, type ImageProps } from 'expo-image';
import { cssInterop } from 'nativewind';

// 서드파티 컴포넌트라 className → style 변환을 등록해야 NativeWind가 닿는다
cssInterop(Image, { className: 'style' });

type Props = Omit<ImageProps, 'source' | 'contentFit' | 'cachePolicy' | 'transition'> & {
  uri: string;
  className?: string;
};

/** 원격 이미지. S3 직접 URL이고 CDN이 없어 메모리·디스크 캐시로 그린다(D51) */
export function RemoteImage({ uri, ...rest }: Props) {
  return (
    <Image
      {...rest}
      source={{ uri }}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
    />
  );
}
