import { render, screen } from '@testing-library/react-native';

import { colors } from '@/shared/config/tokens';

import { Icon, type IconName } from './icon';

const hex = (color: string) => Number.parseInt(`ff${color.slice(1)}`, 16);
/** react-native-svg가 색을 넘기는 모양({ payload: 부호 있는 ARGB }) */
const argb = (brush: unknown) => (brush as { payload: number }).payload >>> 0;

describe('Icon', () => {
  it.each<IconName>(['back', 'search', 'closure', 'capacity', 'location'])(
    '%s 아이콘은 크기대로 그리고 스크린리더에서 숨는다',
    async (name) => {
      await render(<Icon name={name} size={24} testID="icon" />);
      const icon = screen.getByTestId('icon', { includeHiddenElements: true });
      expect(icon).toHaveProp('width', 24);
      expect(icon).not.toBeVisible();
    },
  );

  it('색·채움·획 두께를 바꿀 수 있다', async () => {
    await render(
      <Icon
        name="home"
        color={colors.primaryStrong}
        fill={colors.tint}
        strokeWidth={2.2}
        testID="icon"
      />,
    );
    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toBeTruthy();
  });

  // 반증: 채움 아이콘에 라인 경로를 그리면 획이 생기고 색이 color를 따른다
  it('홈 활성 아이콘은 획 없이 시안 색으로 집을 채우고 가운데 점을 찍는다', async () => {
    await render(<Icon name="homeActive" color={colors.text2} testID="icon" />);
    const paths = screen
      .getByTestId('icon', { includeHiddenElements: true })
      .queryAll((n) => n.type === 'RNSVGPath');
    expect(paths.map((p) => [argb(p.props.fill), p.props.stroke as unknown])).toEqual([
      [hex(colors.homeTabFill), undefined],
      [hex(colors.stepLast), undefined],
    ]);
  });
});
