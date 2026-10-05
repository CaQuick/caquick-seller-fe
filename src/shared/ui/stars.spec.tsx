import { render, screen } from '@testing-library/react-native';

import { Stars } from './stars';

describe('Stars', () => {
  it.each([
    [4, 4],
    [4.5, 5],
    [4.4, 4],
    [0, 0],
    [7, 5],
    [-1, 0],
  ])('%s점은 별 %s개를 채운다', async (value, on) => {
    await render(<Stars value={value} />);
    expect(screen.queryAllByTestId('star-on')).toHaveLength(on);
    expect(screen.queryAllByTestId('star-off')).toHaveLength(5 - on);
  });

  it('점수를 접근성 이름으로, showValue면 숫자를 보인다', async () => {
    await render(<Stars value={4} size="lg" showValue />);
    expect(screen.getByLabelText('별점 5점 중 4.0점')).toBeTruthy();
    expect(screen.getByText('4.0')).toBeTruthy();
  });
});
