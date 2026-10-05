import { render, screen } from '@testing-library/react-native';

import { RemoteImage } from './remote-image';

describe('RemoteImage', () => {
  it('원격 URL을 cover·메모리/디스크 캐시로 그리고 접근성 라벨을 유지한다', async () => {
    await render(<RemoteImage uri="https://img/1.jpg" accessibilityLabel="매장 로고" />);
    const image = screen.getByLabelText('매장 로고');
    expect(image).toHaveProp('source', [{ uri: 'https://img/1.jpg' }]);
    expect(image).toHaveProp('contentFit', 'cover');
    expect(image).toHaveProp('cachePolicy', 'memory-disk');
  });
});
