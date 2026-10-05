import { fireEvent, render, screen } from '@testing-library/react-native';

import { Segmented } from './segmented';

const ITEMS = [
  { value: 'on', label: '판매 중' },
  { value: 'soldout', label: '품절' },
  { value: 'hidden', label: '숨김' },
] as const;

describe('Segmented', () => {
  it.each([
    ['pill', false],
    ['underline', false],
    ['underline', true],
  ] as const)(
    '%s(scrollable=%s): 선택 칸만 selected, 누르면 그 값을 넘긴다',
    async (variant, scrollable) => {
      const onChange = jest.fn();
      await render(
        <Segmented
          items={ITEMS}
          value="on"
          onChange={onChange}
          variant={variant}
          scrollable={scrollable}
          accessibilityLabel="판매 상태"
        />,
      );
      expect(screen.getByRole('tab', { name: '판매 중' })).toBeSelected();
      expect(screen.getByRole('tab', { name: '품절' })).not.toBeSelected();
      await fireEvent.press(screen.getByRole('tab', { name: '숨김' }));
      expect(onChange).toHaveBeenCalledWith('hidden');
    },
  );
});
