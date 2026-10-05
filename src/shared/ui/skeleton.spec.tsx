import { render, screen } from '@testing-library/react-native';

import { Skeleton, SkeletonRows } from './skeleton';

describe('Skeleton', () => {
  it('로딩 라벨과 치수를 가진다', async () => {
    const view = await render(<Skeleton testID="sk" width={120} height={20} />);
    expect(screen.getByRole('progressbar', { name: '불러오는 중' })).toBeTruthy();
    expect(screen.getByTestId('sk')).toHaveStyle({ width: 120, height: 20, borderRadius: 6 });
    await view.unmount();
  });

  it('round면 완전한 원, radius로 반경을 바꾼다', async () => {
    await render(
      <>
        <Skeleton testID="round" round width={40} height={40} />
        <Skeleton testID="card" radius={16} />
      </>,
    );
    expect(screen.getByTestId('round')).toHaveStyle({ borderRadius: 999 });
    expect(screen.getByTestId('card')).toHaveStyle({ borderRadius: 16 });
  });
});

describe('SkeletonRows', () => {
  it('행은 썸네일·제목·보조 줄 3칸, card는 블록 1칸씩', async () => {
    const view = await render(<SkeletonRows count={2} />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(6);
    await view.rerender(<SkeletonRows count={3} card />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });
});
