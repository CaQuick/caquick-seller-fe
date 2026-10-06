import { fireEvent, render, screen } from '@testing-library/react-native';

import { SelectField, TextField } from './text-field';

describe('TextField', () => {
  it('라벨이 접근성 라벨이 되고 입력이 onChangeText로 간다', async () => {
    const onChangeText = jest.fn();
    await render(
      <TextField
        label="상품명"
        sublabel="최대 30자"
        value=""
        onChangeText={onChangeText}
        suffix="원"
      />,
    );
    const input = screen.getByLabelText('상품명');
    await fireEvent.changeText(input, '딸기 케이크');
    expect(onChangeText).toHaveBeenCalledWith('딸기 케이크');
    expect(screen.getByText('원')).toBeTruthy();
    expect(screen.getByText('최대 30자')).toBeTruthy();
  });

  it('오류 문구를 보이고, 없으면 그리지 않는다', async () => {
    const view = await render(<TextField label="가격" error="숫자를 입력해 주세요." />);
    expect(screen.getByText('숫자를 입력해 주세요.')).toBeTruthy();
    await view.rerender(<TextField label="가격" error={null} />);
    expect(screen.queryByText('숫자를 입력해 주세요.')).toBeNull();
  });

  it('포커스·블러를 추적하면서 호출자 핸들러도 부른다', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await render(<TextField label="상품명" onFocus={onFocus} onBlur={onBlur} />);
    const input = screen.getByLabelText('상품명');
    await fireEvent(input, 'focus', {});
    await fireEvent(input, 'blur', {});
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('멀티라인은 위 정렬, alignRight는 오른쪽 정렬, 읽기 전용은 비활성으로 드러난다', async () => {
    await render(
      <>
        <TextField label="설명" multiline />
        <TextField label="수량" alignRight />
        <TextField label="사업자번호" editable={false} value="123-45-67890" />
      </>,
    );
    expect(screen.getByLabelText('설명')).toHaveProp('textAlignVertical', 'top');
    expect(screen.getByLabelText('수량')).toHaveProp('textAlign', 'right');
    expect(screen.getByLabelText('사업자번호')).toBeDisabled();
    expect(screen.getByLabelText('설명')).toBeEnabled();
  });
});

describe('SelectField', () => {
  it('값이 없으면 placeholder를 값으로 알리고 누르면 onPress', async () => {
    const onPress = jest.fn();
    await render(<SelectField label="카테고리" onPress={onPress} />);
    const field = screen.getByRole('button', { name: '카테고리' });
    expect(field).toHaveAccessibilityValue({ text: '선택하세요' });
    await fireEvent.press(field);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('선택값을 보이고, disabled면 눌리지 않는다(반증)', async () => {
    const onPress = jest.fn();
    await render(<SelectField label="카테고리" value="크리스마스" disabled onPress={onPress} />);
    expect(screen.getByText('크리스마스')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '카테고리' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
