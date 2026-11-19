import { Skia, type SkImage } from '@shopify/react-native-skia';

/** 세션 동안 기억하는 꾸미기 이미지 수 */
const LIMIT = 64;

type Load = (url: string) => Promise<SkImage | null>;

const loadFromNetwork: Load = async (url) =>
  Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(url));

/**
 * 최근 limit장을 기억하는 이미지 캐시. 같은 URL을 동시에 부르면 요청 하나를 나눠 쓴다.
 * 실패(null)는 기억하지 않아 다음 요청이 다시 받는다
 */
export function createImageCache(load: Load = loadFromNetwork, limit = LIMIT) {
  const entries = new Map<string, Promise<SkImage | null>>();
  return (url: string): Promise<SkImage | null> => {
    const cached = entries.get(url);
    if (cached) {
      // 최근에 쓴 것을 뒤로 옮겨 오래된 것부터 버린다
      entries.delete(url);
      entries.set(url, cached);
      return cached;
    }
    const request = load(url)
      .catch(() => null)
      .then((image) => {
        if (!image && entries.get(url) === request) entries.delete(url);
        return image;
      });
    entries.set(url, request);
    if (entries.size > limit) entries.delete(entries.keys().next().value!);
    return request;
  };
}

export const loadDecoImage = createImageCache();
