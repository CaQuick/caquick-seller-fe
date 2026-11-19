import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ImageViewer } from './image-viewer';

const METRICS = {
  frame: { x: 0, y: 0, width: 750, height: 1334 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const IMAGES = ['https://img/1.jpg', 'https://img/2.jpg', 'https://img/3.jpg'];

const show = (index: number | null, onClose = jest.fn(), labels?: string[]) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ImageViewer images={IMAGES} labels={labels} index={index} onClose={onClose} />
    </SafeAreaProvider>,
  );

describe('ImageViewer', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', async () => {
    await show(null);
    expect(screen.queryByRole('button', { name: '닫기' })).toBeNull();
  });

  it('고른 장부터 contain으로 보여 주고, 넘기면 몇 번째인지 바꾼다', async () => {
    await show(1, jest.fn(), ['윗면', '앞', '뒤']);
    expect(screen.getByText('앞 · 2/3')).toBeTruthy();
    expect(screen.getByLabelText('뒤')).toHaveProp('contentFit', 'contain');
    await fireEvent(screen.getByTestId('image-viewer-pages'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 750 * 2, y: 0 } },
    });
    expect(screen.getByText('뒤 · 3/3')).toBeTruthy();
  });

  it('이름이 없으면 순서로 부르고, 닫기를 누르면 알린다', async () => {
    const onClose = jest.fn();
    await show(0, onClose);
    expect(screen.getByText('이미지 1 · 1/3')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalled();
  });
});
