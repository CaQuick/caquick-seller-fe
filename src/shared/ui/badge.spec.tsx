import { render, screen } from '@testing-library/react-native';

import { Badge } from './badge';

describe('Badge', () => {
  it('개수를 보이고 max를 넘으면 n+로 줄인다', async () => {
    await render(
      <>
        <Badge count={3} />
        <Badge count={120} tone="primary" />
      </>,
    );
    expect(screen.getByLabelText('3건')).toBeTruthy();
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it.each([0, -1])('반증: %s건이면 그리지 않는다', async (count) => {
    await render(<Badge count={count} />);
    expect(screen.toJSON()).toBeNull();
  });
});
