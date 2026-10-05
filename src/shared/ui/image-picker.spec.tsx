import { fireEvent, render, screen } from '@testing-library/react-native';

import { ImageDropzone, ImageThumb } from './image-picker';

describe('ImageDropzone', () => {
  it('개수/최대를 보이고 누르면 onPress', async () => {
    const onPress = jest.fn();
    await render(<ImageDropzone count={1} onPress={onPress} />);
    const drop = screen.getByRole('button', { name: '이미지 추가 (1/6)' });
    await fireEvent.press(drop);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('반증: 가득 차면 눌리지 않는다', async () => {
    const onPress = jest.fn();
    await render(<ImageDropzone count={6} onPress={onPress} />);
    const drop = screen.getByRole('button', { name: '이미지 추가 (6/6)' });
    await fireEvent.press(drop);
    expect(onPress).not.toHaveBeenCalled();
    expect(drop).toBeDisabled();
  });
});

describe('ImageThumb', () => {
  it('× 버튼으로 지우고, onRemove가 없으면 버튼이 없다', async () => {
    const onRemove = jest.fn();
    const view = await render(
      <ImageThumb uri="https://img/1.jpg" label="상품 이미지 1" onRemove={onRemove} />,
    );
    expect(screen.getByLabelText('상품 이미지 1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '상품 이미지 1 삭제' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    await view.rerender(<ImageThumb uri="https://img/1.jpg" label="상품 이미지 1" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
