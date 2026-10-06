import { fireEvent, render, screen } from '@testing-library/react-native';

import { MenuGroup, MenuRow } from './menu';
import { Switch } from './switch';

describe('MenuGroup·MenuRow', () => {
  it('누를 수 있는 행은 제목·설명·보조를 묶은 버튼이다', async () => {
    const onPress = jest.fn();
    await render(
      <MenuGroup>
        <MenuRow
          icon="clock"
          title="영업시간"
          description="월–토 10:00–19:00"
          aux="수정"
          onPress={onPress}
        />
        <MenuRow title="로그아웃" danger onPress={onPress} />
      </MenuGroup>,
    );
    await fireEvent.press(
      screen.getByRole('button', { name: '영업시간, 월–토 10:00–19:00, 수정' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: '로그아웃' }));
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('반증: accessory가 있으면 행은 버튼이 아니고 조작은 accessory가 맡는다', async () => {
    const onPress = jest.fn();
    const onValueChange = jest.fn();
    await render(
      <MenuGroup>
        <MenuRow
          title="새 주문 알림"
          onPress={onPress}
          accessory={
            <Switch value onValueChange={onValueChange} accessibilityLabel="새 주문 알림" />
          }
        />
        <MenuRow title="버전" aux="1.0.0" />
      </MenuGroup>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    await fireEvent.press(screen.getByRole('switch', { name: '새 주문 알림' }));
    expect(onValueChange).toHaveBeenCalledWith(false);
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('1.0.0')).toBeTruthy();
  });
});
