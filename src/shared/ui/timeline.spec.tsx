import { render, screen } from '@testing-library/react-native';

import { Timeline, type TimelineItem } from './timeline';

const ITEMS: TimelineItem[] = [
  { key: '1', title: '주문 접수', state: 'done', at: '10월 5일 20:14 · 김다은' },
  { key: '2', title: '확정', state: 'now', memo: '레터링 문구 변경' },
  { key: '3', title: '제작 완료', state: 'todo' },
  { key: '4', title: '거절', state: 'bad' },
];

describe('Timeline', () => {
  it('행마다 제목·상태·시각을 접근성 이름으로 묶고 메모를 보인다', async () => {
    await render(<Timeline items={ITEMS} />);
    expect(screen.getByLabelText('주문 접수, 완료, 10월 5일 20:14 · 김다은')).toBeTruthy();
    expect(screen.getByLabelText('확정, 현재 단계')).toBeTruthy();
    expect(screen.getByLabelText('제작 완료, 예정')).toBeTruthy();
    expect(screen.getByLabelText('거절, 중단')).toBeTruthy();
    expect(screen.getByText('레터링 문구 변경')).toBeTruthy();
  });

  it('반증: 세로선은 마지막 행에만 없다', async () => {
    const view = await render(<Timeline items={ITEMS} />);
    expect(screen.getAllByTestId('timeline-line')).toHaveLength(3);
    await view.rerender(<Timeline items={ITEMS.slice(0, 1)} />);
    expect(screen.queryByTestId('timeline-line')).toBeNull();
  });
});
