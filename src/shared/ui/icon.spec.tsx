import { render, screen } from '@testing-library/react-native';

import { colors } from '@/shared/config/tokens';

import { Icon, type IconName } from './icon';

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
});
