import { fireEvent, render, screen } from '@testing-library/react-native';

import { Fab } from './fab';

describe('Fab', () => {
  it('접근성 라벨로 찾고 누르면 onPress', async () => {
    const onPress = jest.fn();
    await render(<Fab accessibilityLabel="상품 등록" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: '상품 등록' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
