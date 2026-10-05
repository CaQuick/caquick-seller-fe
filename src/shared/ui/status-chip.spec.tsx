import { render, screen } from '@testing-library/react-native';

import { type StatusTone, StatusChip } from './status-chip';

describe('StatusChip', () => {
  it.each<StatusTone>(['primary', 'positive', 'caution', 'negative', 'neutral'])(
    '%s 톤도 문구가 라벨이다',
    async (tone) => {
      await render(<StatusChip tone={tone} label="접수" />);
      expect(screen.getByLabelText('접수')).toBeTruthy();
      expect(screen.getByText('접수')).toBeTruthy();
    },
  );
});
