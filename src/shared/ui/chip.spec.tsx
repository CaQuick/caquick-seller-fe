import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip, type ChipVariant, TagChip } from './chip';

describe('Chip', () => {
  it.each<ChipVariant>(['select', 'filter', 'meta'])(
    '%s 칩은 라벨로 찾고 선택 상태를 접근성에 드러낸다',
    async (variant) => {
      const onPress = jest.fn();
      await render(<Chip label="전체" variant={variant} selected onPress={onPress} />);
      const chip = screen.getByRole('button', { name: '전체' });
      expect(chip).toBeSelected();
      await fireEvent.press(chip);
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );

  it('small은 filter 칩의 옛 이름이다', async () => {
    await render(<Chip label="접수" small />);
    expect(screen.getByRole('button', { name: '접수' })).not.toBeSelected();
  });

  it('반증: disabled면 눌리지 않는다', async () => {
    const onPress = jest.fn();
    await render(<Chip label="접수" disabled onPress={onPress} />);
    const chip = screen.getByRole('button', { name: '접수' });
    await fireEvent.press(chip);
    expect(onPress).not.toHaveBeenCalled();
    expect(chip).toBeDisabled();
  });
});

describe('TagChip', () => {
  it('light 태그는 × 버튼으로 지운다', async () => {
    const onRemove = jest.fn();
    await render(<TagChip label="#트리" onRemove={onRemove} />);
    await fireEvent.press(screen.getByRole('button', { name: '#트리 삭제' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('반증: dark 태그와 onRemove 없는 태그에는 삭제 버튼이 없다', async () => {
    await render(
      <>
        <TagChip label="# 눈" tone="dark" onRemove={jest.fn()} />
        <TagChip label="#트리" />
      </>,
    );
    expect(screen.getByText('# 눈')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
