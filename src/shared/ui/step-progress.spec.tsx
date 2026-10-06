import { render, screen } from '@testing-library/react-native';

import { StepProgress } from './step-progress';

describe('StepProgress', () => {
  it.each([
    [1, '기본 정보', 1],
    [2, '옵션 정보', 2],
    [3, '등록 미리보기', 1],
  ] as const)('%s단계(%s)는 칸 %s개를 채운다', async (step, label, filled) => {
    await render(<StepProgress step={step} label={label} />);
    const bar = screen.getByRole('progressbar', { name: `${step}/3 ${label}` });
    expect(bar).toHaveAccessibilityValue({ min: 1, max: 3, now: step });
    expect(screen.getByText(`${step}/3 ${label}`)).toBeTruthy();
    expect(screen.getAllByTestId('step-filled', { includeHiddenElements: true })).toHaveLength(
      filled,
    );
    expect(screen.getAllByTestId('step-empty', { includeHiddenElements: true })).toHaveLength(
      3 - filled,
    );
  });
});
