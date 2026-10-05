import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './button';
import { Empty, ErrorState } from './empty';

describe('Empty', () => {
  it('아이콘·제목·설명·액션을 보인다', async () => {
    await render(
      <Empty
        icon="products"
        title="등록된 상품이 없어요"
        description="첫 상품을 등록해 보세요."
        action={<Button title="상품 등록" size="sm" />}
      />,
    );
    expect(screen.getByLabelText('등록된 상품이 없어요')).toBeTruthy();
    expect(screen.getByText('첫 상품을 등록해 보세요.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '상품 등록' })).toBeTruthy();
  });

  it('설명·액션 없이도 그려진다', async () => {
    await render(<Empty title="주문이 없어요" />);
    expect(screen.getByText('주문이 없어요')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ErrorState', () => {
  it('기본 문구와 다시 시도 버튼을 보인다', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText('불러오지 못했어요')).toBeTruthy();
    expect(screen.getByText('네트워크 상태를 확인한 뒤 다시 시도해 주세요')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('반증: onRetry가 없으면 버튼이 없다', async () => {
    await render(<ErrorState title="권한이 없어요" description="관리자에게 문의해 주세요" />);
    expect(screen.getByText('권한이 없어요')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
