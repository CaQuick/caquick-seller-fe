/**
 * @jest-environment ./src/test/skia-environment.js
 */
import { AlphaType, ColorType, Skia, type SkImage } from '@shopify/react-native-skia';

import { createImageCache, loadDecoImage } from './image-cache';

const image = (url: string) => ({ url }) as unknown as SkImage;

function loader(fail: (url: string) => boolean = () => false) {
  const calls: string[] = [];
  const load = (url: string) => {
    calls.push(url);
    return fail(url) ? Promise.reject(new Error('404')) : Promise.resolve(image(url));
  };
  return { calls, load };
}

describe('createImageCache', () => {
  it('같은 URL은 동시에 불러도 한 번만 받고 같은 이미지를 나눠 쓴다', async () => {
    const { calls, load } = loader();
    const get = createImageCache(load);
    const [a, b] = await Promise.all([get('u1'), get('u1')]);
    expect(a).toBe(b);
    expect(await get('u1')).toBe(a);
    expect(calls).toEqual(['u1']);
  });

  it('상한을 넘으면 가장 오래 안 쓴 것부터 버린다', async () => {
    const { calls, load } = loader();
    const get = createImageCache(load, 2);
    await get('u1');
    await get('u2');
    await get('u1'); // u1을 최근으로
    await get('u3'); // u2가 밀려난다
    await get('u1');
    await get('u2');
    expect(calls).toEqual(['u1', 'u2', 'u3', 'u2']);
  });

  it('받지 못한 이미지는 null이고 기억하지 않아 다음에 다시 받는다', async () => {
    let broken = true;
    const { calls, load } = loader(() => broken);
    const get = createImageCache(load);
    expect(await get('u1')).toBeNull();
    broken = false;
    expect(await get('u1')).toEqual(image('u1'));
    expect(calls).toEqual(['u1', 'u1']);
  });
});

describe('loadDecoImage', () => {
  it('URL의 PNG를 받아 Skia 이미지로 디코드한다', async () => {
    const png = Skia.Image.MakeImage(
      { width: 3, height: 2, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
      Skia.Data.fromBytes(new Uint8Array(3 * 2 * 4).fill(255)),
      12,
    )!.encodeToBytes();
    const fromURI = jest
      .spyOn(Skia.Data, 'fromURI')
      .mockResolvedValueOnce(Skia.Data.fromBytes(png));
    const image = await loadDecoImage('https://cdn/number-1.png');
    expect(fromURI).toHaveBeenCalledWith('https://cdn/number-1.png');
    expect([image!.width(), image!.height()]).toEqual([3, 2]);
  });
});
