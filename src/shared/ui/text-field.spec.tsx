import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from './text-field';

describe('TextField', () => {
  it('라벨이 접근성 라벨이 되고 입력이 onChangeText로 간다', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="상품명" value="" onChangeText={onChangeText} suffix="원" />);
    const input = screen.getByLabelText('상품명');
    await fireEvent.changeText(input, '딸기 케이크');
    expect(onChangeText).toHaveBeenCalledWith('딸기 케이크');
    expect(screen.getByText('원')).toBeTruthy();
    expect(screen.getByText('상품명')).toBeTruthy();
  });

  it('오류 문구를 보이고, 없으면 그리지 않는다', async () => {
    const view = await render(<TextField label="가격" error="숫자를 입력해 주세요." />);
    expect(screen.getByText('숫자를 입력해 주세요.')).toBeTruthy();
    await view.rerender(<TextField label="가격" error={null} />);
    expect(screen.queryByText('숫자를 입력해 주세요.')).toBeNull();
  });

  it('멀티라인은 위 정렬 입력', async () => {
    await render(<TextField label="설명" multiline />);
    expect(screen.getByLabelText('설명')).toHaveProp('textAlignVertical', 'top');
  });
});
