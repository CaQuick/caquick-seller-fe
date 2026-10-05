import { fireEvent, render, screen } from '@testing-library/react-native';

import { Stepper } from './stepper';

describe('Stepper', () => {
  it('step만큼 늘리고 줄이며 값을 접근성 값으로 알린다', async () => {
    const onChange = jest.fn();
    await render(
      <Stepper
        value={30}
        step={10}
        min={0}
        max={120}
        onChange={onChange}
        accessibilityLabel="픽업 간격"
      />,
    );
    expect(screen.getByLabelText('픽업 간격')).toHaveAccessibilityValue({
      now: 30,
      min: 0,
      max: 120,
    });
    await fireEvent.press(screen.getByRole('button', { name: '픽업 간격 늘리기' }));
    await fireEvent.press(screen.getByRole('button', { name: '픽업 간격 줄이기' }));
    expect(onChange.mock.calls).toEqual([[40], [20]]);
  });

  it('반증: 범위 끝에서는 그 방향 버튼이 꺼진다', async () => {
    const onChange = jest.fn();
    const view = await render(
      <Stepper value={1} min={1} max={3} onChange={onChange} accessibilityLabel="수량" size="lg" />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '수량 줄이기' }));
    expect(screen.getByRole('button', { name: '수량 줄이기' })).toBeDisabled();
    await view.rerender(
      <Stepper value={3} min={1} max={3} onChange={onChange} accessibilityLabel="수량" />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '수량 늘리기' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('step이 범위를 넘으면 끝값으로 자른다', async () => {
    const onChange = jest.fn();
    await render(
      <Stepper value={8} step={5} max={10} onChange={onChange} accessibilityLabel="수량" />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '수량 늘리기' }));
    expect(onChange).toHaveBeenCalledWith(10);
  });
});
