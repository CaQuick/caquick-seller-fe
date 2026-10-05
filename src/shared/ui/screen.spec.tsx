import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Screen } from './screen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, bottom: 34, left: 0, right: 0 },
};

describe('Screen', () => {
  it('안전 영역을 padding으로 준다', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen testID="screen">
          <Text>내용</Text>
        </Screen>
      </SafeAreaProvider>,
    );
    expect(screen.getByText('내용')).toBeTruthy();
    expect(screen.getByTestId('screen')).toHaveStyle({ paddingTop: 47, paddingBottom: 34 });
  });

  it('반증: edges에서 뺀 쪽은 0', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen testID="screen" edges={['bottom']}>
          <Text>내용</Text>
        </Screen>
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('screen')).toHaveStyle({ paddingTop: 0, paddingBottom: 34 });
  });
});
