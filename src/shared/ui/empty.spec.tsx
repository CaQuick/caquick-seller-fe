import { render, screen } from '@testing-library/react-native';

import { Button } from './button';
import { Empty } from './empty';

describe('Empty', () => {
  it('제목·설명·액션을 보인다', async () => {
    await render(
      <Empty
        title="등록된 상품이 없어요"
        description="첫 상품을 등록해 보세요."
        action={<Button title="상품 등록" />}
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
