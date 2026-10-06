import { fireEvent, render, screen } from '@testing-library/react-native';

import { SearchBar } from './search-bar';

describe('SearchBar', () => {
  it('placeholder가 접근성 이름이 되고 입력이 onChangeText로 간다', async () => {
    const onChangeText = jest.fn();
    await render(
      <SearchBar value="" onChangeText={onChangeText} placeholder="주문자·상품명 검색" />,
    );
    await fireEvent.changeText(screen.getByLabelText('주문자·상품명 검색'), '김다은');
    expect(onChangeText).toHaveBeenCalledWith('김다은');
  });

  it('값이 있으면 지우기 버튼이 빈 문자열을 넘기고, 없으면 버튼이 없다(반증)', async () => {
    const onChangeText = jest.fn();
    const view = await render(
      <SearchBar value="청라" onChangeText={onChangeText} accessibilityLabel="지역 검색" />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '검색어 지우기' }));
    expect(onChangeText).toHaveBeenCalledWith('');
    await view.rerender(
      <SearchBar value="" onChangeText={onChangeText} accessibilityLabel="지역 검색" />,
    );
    expect(screen.queryByRole('button', { name: '검색어 지우기' })).toBeNull();
  });
});
