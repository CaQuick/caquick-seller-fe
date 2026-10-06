import { fireEvent, render, screen } from '@testing-library/react-native';

import { SectionHeader } from './section-header';

describe('SectionHeader', () => {
  it('제목을 헤더로, 개수를 옆에, 액션을 버튼으로 둔다', async () => {
    const onPress = jest.fn();
    await render(
      <SectionHeader title="최근 후기" count={48} action={{ label: '전체 보기 ›', onPress }} />,
    );
    expect(screen.getByRole('header', { name: '최근 후기 48' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '전체 보기 ›' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('개수·액션 없이도 그려진다', async () => {
    await render(<SectionHeader title="계정" />);
    expect(screen.getByRole('header', { name: '계정' })).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
