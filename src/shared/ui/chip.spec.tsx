import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from './chip';

describe('Chip', () => {
  it('라벨로 찾고 선택 상태를 접근성에 드러낸다', async () => {
    const onPress = jest.fn();
    await render(<Chip label="전체" selected onPress={onPress} />);
    const chip = screen.getByRole('button', { name: '전체' });
    expect(chip).toBeSelected();
    expect(chip).toBeEnabled();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('반증: disabled면 눌리지 않는다', async () => {
    const onPress = jest.fn();
    await render(<Chip label="접수" disabled onPress={onPress} />);
    const chip = screen.getByRole('button', { name: '접수' });
    await fireEvent.press(chip);
    expect(onPress).not.toHaveBeenCalled();
    expect(chip).toBeDisabled();
    expect(chip).not.toBeSelected();
  });
});
