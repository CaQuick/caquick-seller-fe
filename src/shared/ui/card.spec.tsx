import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card, KeyValue } from './card';

describe('Card·KeyValue', () => {
  it('제목·오른쪽 요소·라벨-값 줄을 그린다', async () => {
    await render(
      <Card title="결제 정보" aside={<Text>영수증</Text>}>
        <KeyValue label="상품 금액" value="33,000원" />
        <KeyValue label="합계" value="38,000원" total />
      </Card>,
    );
    expect(screen.getByRole('header', { name: '결제 정보' })).toBeTruthy();
    expect(screen.getByText('영수증')).toBeTruthy();
    expect(screen.getByText('33,000원')).toBeTruthy();
    expect(screen.getByText('38,000원')).toBeTruthy();
  });

  it('제목이 없으면 헤더가 없다', async () => {
    await render(
      <Card>
        <Text>내용</Text>
      </Card>,
    );
    expect(screen.queryByRole('header')).toBeNull();
  });
});
