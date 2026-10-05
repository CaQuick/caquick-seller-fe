import { render, screen } from '@testing-library/react-native';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('로딩 라벨과 치수를 가진다', async () => {
    const view = await render(<Skeleton testID="sk" width={120} height={20} />);
    expect(screen.getByRole('progressbar', { name: '불러오는 중' })).toBeTruthy();
    expect(screen.getByTestId('sk')).toHaveStyle({ width: 120, height: 20 });
    await view.unmount();
  });

  it('round면 완전한 원', async () => {
    await render(<Skeleton testID="sk" round width={40} height={40} />);
    expect(screen.getByTestId('sk')).toHaveStyle({ borderRadius: 999 });
  });
});
