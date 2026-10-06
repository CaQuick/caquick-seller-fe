import { fireEvent, render, screen } from '@testing-library/react-native';

import { Switch } from './switch';

describe('Switch', () => {
  it.each([true, false])('value=%s를 checked로 드러내고 누르면 반대 값을 넘긴다', async (value) => {
    const onValueChange = jest.fn();
    await render(
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel="새 주문 알림" />,
    );
    const sw = screen.getByRole('switch', { name: '새 주문 알림' });
    expect(sw).toHaveProp('accessibilityState', { checked: value, disabled: false });
    await fireEvent.press(sw);
    expect(onValueChange).toHaveBeenCalledWith(!value);
  });

  it('반증: disabled면 바뀌지 않는다', async () => {
    const onValueChange = jest.fn();
    await render(<Switch value onValueChange={onValueChange} accessibilityLabel="알림" disabled />);
    await fireEvent.press(screen.getByRole('switch', { name: '알림' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
