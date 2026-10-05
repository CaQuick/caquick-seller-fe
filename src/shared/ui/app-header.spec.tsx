import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AppHeader } from './app-header';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

describe('AppHeader', () => {
  afterEach(() => jest.clearAllMocks());

  it('제목을 헤더로 두고 뒤로가기는 기본으로 router.back()', async () => {
    await render(<AppHeader title="주문 상세" />);
    expect(screen.getByRole('header', { name: '주문 상세' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('텍스트·아이콘 액션을 오른쪽에 둔다', async () => {
    const onEdit = jest.fn();
    const onMore = jest.fn();
    const view = await render(
      <AppHeader title="상품 상세" right={{ label: '수정', onPress: onEdit }} />,
    );
    expect(screen.getByText('수정')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '수정' }));
    await view.rerender(
      <AppHeader title="김다은" right={{ label: '더 보기', icon: 'more', onPress: onMore }} />,
    );
    expect(screen.queryByText('더 보기')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '더 보기' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it('반증: onBack이 null이면 뒤로가기가 없고, 주어지면 router 대신 그것을 부른다', async () => {
    const onBack = jest.fn();
    const view = await render(<AppHeader title="비밀번호 변경" onBack={null} />);
    expect(screen.queryByRole('button', { name: '뒤로 가기' })).toBeNull();
    await view.rerender(<AppHeader title="상품 등록" onBack={onBack} />);
    await fireEvent.press(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });
});
