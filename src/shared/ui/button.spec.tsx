import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button, type ButtonVariant } from './button';

describe('Button', () => {
  it('제목이 접근성 라벨이 되고 누르면 onPress가 불린다', async () => {
    const onPress = jest.fn();
    await render(<Button title="저장" onPress={onPress} />);
    const button = screen.getByRole('button', { name: '저장' });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(button).toBeEnabled();
    expect(button).not.toBeBusy();
  });

  it.each<ButtonVariant>(['primary', 'secondary', 'soft', 'danger', 'dangerOutline'])(
    '%s 변형도 sm·pill과 함께 눌린다',
    async (variant) => {
      const onPress = jest.fn();
      await render(
        <>
          <Button title="sm" variant={variant} size="sm" onPress={onPress} />
          <Button title="pill" variant={variant} pill onPress={onPress} />
        </>,
      );
      await fireEvent.press(screen.getByRole('button', { name: 'sm' }));
      await fireEvent.press(screen.getByRole('button', { name: 'pill' }));
      expect(onPress).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    ['disabled', { disabled: true }],
    ['loading', { loading: true }],
  ])('반증: %s면 눌러도 onPress가 불리지 않는다', async (_, props) => {
    const onPress = jest.fn();
    await render(<Button title="저장" onPress={onPress} {...props} />);
    const button = screen.getByRole('button', { name: '저장' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('loading이면 제목 대신 인디케이터를 보인다', async () => {
    await render(<Button title="저장" variant="secondary" loading accessibilityLabel="저장 중" />);
    expect(screen.queryByText('저장')).toBeNull();
    expect(screen.getByRole('button', { name: '저장 중' })).toBeBusy();
  });
});
