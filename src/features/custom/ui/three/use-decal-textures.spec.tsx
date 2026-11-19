/**
 * @jest-environment ./src/test/skia-environment.js
 */
import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as THREE from 'three';

import { pretendardFonts } from '@/test/skia';

import { type DecalSpec } from '../../model/render-input';
import { loadDecoImage } from '../../model/texture/image-cache';
import { useDecalTextures } from './use-decal-textures';

jest.mock('../../model/texture/image-cache', () => ({ loadDecoImage: jest.fn() }));

const fonts = pretendardFonts();
const effect = { type: 'none' as const, intensity: 0 };
const text = (key: string): DecalSpec => ({
  key,
  face: 'top',
  item: { kind: 'TEXT', x: 0.5, y: 0.5, size: 10, effect, text: 'A', color: '#1D1D1D' },
  deco: null,
});
const deco = (key: string, imageUrl: string): DecalSpec => ({
  key,
  face: 'side',
  item: { kind: 'DECO', x: 0.5, y: 0.5, size: 20, effect, decoId: 'number-1' },
  deco: { imageUrl, label: '1' },
});
const pixel = () =>
  Skia.Image.MakeImage(
    { width: 1, height: 1, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
    Skia.Data.fromBytes(Uint8Array.from([255, 0, 0, 255])),
    4,
  );

describe('useDecalTextures', () => {
  beforeEach(() => jest.mocked(loadDecoImage).mockReset().mockResolvedValue(pixel()));

  it('같은 그림은 한 번만 그려 key별 텍스처·크기를 내주고, 떠나면 텍스처를 내린다', async () => {
    jest
      .mocked(loadDecoImage)
      .mockImplementation((url) => Promise.resolve(url.includes('broken') ? null : pixel()));
    const decals = [
      text('a'),
      text('a'),
      deco('d', 'https://cdn/1.png'),
      deco('x', 'https://cdn/broken.png'),
    ];
    const onError = jest.fn();
    const hook = await renderHook(() => useDecalTextures(decals, fonts, onError));
    await waitFor(() => expect(hook.result.current.textures.size).toBe(3));
    const { textures, pixels } = hook.result.current;
    expect([...pixels.keys()]).toEqual(['a', 'd', 'x']);
    expect(pixels.get('d')).toEqual({ width: 256, height: 256 });
    expect([...textures.values()].every((t) => t instanceof THREE.DataTexture)).toBe(true);
    // 이미지를 받지 못한 꾸미기도 대체 상자로 그려 붙인다
    expect(jest.mocked(loadDecoImage).mock.calls).toEqual([
      ['https://cdn/1.png'],
      ['https://cdn/broken.png'],
    ]);
    expect(onError).not.toHaveBeenCalled();

    const disposed = [...textures.values()].map((t) => jest.spyOn(t, 'dispose'));
    await hook.unmount();
    for (const spy of disposed) expect(spy).toHaveBeenCalled();
  });

  it('데칼이 바뀌면 이전 텍스처를 내리고 새 그림만 남긴다', async () => {
    const hook = await renderHook(
      ({ decals }: { decals: DecalSpec[] }) => useDecalTextures(decals, fonts, jest.fn()),
      { initialProps: { decals: [text('a'), text('b')] } },
    );
    await waitFor(() => expect(hook.result.current.textures.size).toBe(2));
    const before = [...hook.result.current.textures.values()];
    const disposed = before.map((t) => jest.spyOn(t, 'dispose'));

    await hook.rerender({ decals: [text('c')] });
    for (const spy of disposed) expect(spy).toHaveBeenCalled();
    await waitFor(() => expect([...hook.result.current.textures.keys()]).toEqual(['c']));
    expect([...hook.result.current.pixels.keys()]).toEqual(['c']);
    expect(before).not.toContain(hook.result.current.textures.get('c'));
  });

  it('이미지를 받는 사이 화면을 떠나면 그리지 않는다', async () => {
    let release!: (image: ReturnType<typeof pixel>) => void;
    jest.mocked(loadDecoImage).mockReturnValue(new Promise((resolve) => (release = resolve)));
    const draw = jest.spyOn(Skia.Surface, 'Make');
    const hook = await renderHook(() =>
      useDecalTextures([deco('d', 'https://cdn/1.png')], fonts, jest.fn()),
    );
    await waitFor(() => expect(loadDecoImage).toHaveBeenCalled());
    await hook.unmount();
    release(pixel());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(draw).not.toHaveBeenCalled();
    draw.mockRestore();
  });

  it('글꼴을 읽기 전에는 아무것도 그리지 않는다', async () => {
    const hook = await renderHook(() => useDecalTextures([text('a')], null, jest.fn()));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(hook.result.current.textures.size).toBe(0);
    expect(hook.result.current.pixels.size).toBe(0);
  });

  it('그리다 실패하면 알린다', async () => {
    jest.mocked(loadDecoImage).mockRejectedValue(new Error('decode'));
    const onError = jest.fn();
    await renderHook(() => useDecalTextures([deco('d', 'https://cdn/1.png')], fonts, onError));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(new Error('decode')));
  });
});
