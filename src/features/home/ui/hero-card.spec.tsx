import { fireEvent, render, screen } from '@testing-library/react-native';

import { gradient } from '@/shared/config/tokens';

import { cssGradientLine } from '../model/gradient';
import { HeroCard } from './hero-card';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: jest.fn() }) }));

const gradientProps = () =>
  screen.container.queryAll((n) => n.type === 'RNSVGLinearGradient')[0]?.props;

async function layout(width: number, height: number) {
  await fireEvent(screen.getByTestId('hero-background'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
  return gradientProps();
}

describe('HeroCard', () => {
  it('카드 크기를 재서 토큰 그라디언트를 픽셀 각도로 깔고 히어로 그림자를 쓴다', async () => {
    await render(<HeroCard remainingCapacity={12} />);
    expect(screen.getByTestId('hero')).toHaveStyle({
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
    });
    expect(gradientProps()).toBeUndefined();

    const props = await layout(338, 191);
    expect(props).toMatchObject(cssGradientLine(45, 338, 191));
    const stops = props?.gradient as number[];
    expect(stops.filter((_, i) => i % 2 === 0)).toEqual([0, 0.4, 0.6, 1]);
    expect(
      stops.filter((_, i) => i % 2 === 1).map((c) => `#${(c >>> 0).toString(16).slice(2)}`),
    ).toEqual(gradient.hero.stops.map(([, color]) => color.toLowerCase()));
  });

  // 반증: objectBoundingBox(0)면 픽셀 좌표가 박스 비율로 다시 늘어나 각도가 어긋난다
  it('반증: 좌표는 userSpace라 크기가 바뀌면 다시 계산한다', async () => {
    await render(<HeroCard remainingCapacity={null} />);
    const first = await layout(338, 191);
    expect(first?.gradientUnits).toBe(1);
    const resized = await layout(338, 240);
    expect(resized).toMatchObject(cssGradientLine(45, 338, 240));
    expect(resized?.y1).not.toBeCloseTo(first?.y1 as number);
  });
});
