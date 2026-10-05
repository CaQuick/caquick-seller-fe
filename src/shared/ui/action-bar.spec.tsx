import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActionBar } from './action-bar';

const metrics = (bottom: number) => ({
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, bottom, left: 0, right: 0 },
});

describe('ActionBar', () => {
  it('보조·주 버튼을 나란히 두고 각각 누른다', async () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics(34)}>
        <ActionBar
          secondary={{ title: '이전 단계', onPress: onPrev }}
          primary={{ title: '등록하기', onPress: onNext }}
        />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: '이전 단계' }));
    await fireEvent.press(screen.getByRole('button', { name: '등록하기' }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('보조 버튼이 없으면 단일 버튼, 주 버튼 disabled는 그대로 전달된다', async () => {
    const onSave = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics(0)}>
        <ActionBar primary={{ title: '저장', onPress: onSave, disabled: true }} />
      </SafeAreaProvider>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
