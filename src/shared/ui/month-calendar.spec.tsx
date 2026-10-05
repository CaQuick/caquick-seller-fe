import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthCalendar } from './month-calendar';

const OCT = { y: 2026, m: 10 };

describe('MonthCalendar', () => {
  it('월 제목·요일·42칸을 그리고 날짜 상태를 접근성 이름에 담는다', async () => {
    await render(
      <MonthCalendar
        month={OCT}
        onMonthChange={jest.fn()}
        today={{ y: 2026, m: 10, d: 6 }}
        selected={['2026-10-07']}
        days={{
          '2026-10-06': { caption: '12' },
          '2026-10-07': { caption: '12' },
          '2026-10-09': { state: 'off', caption: '휴무' },
          '2026-10-11': { state: 'full', caption: '마감' },
        }}
        legend={['sel', 'off', 'full']}
        onSelectDay={jest.fn()}
      />,
    );
    expect(screen.getByRole('header', { name: '2026년 10월' })).toBeTruthy();
    expect(screen.getByText('일')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /월 \d+일/ })).toHaveLength(42);
    expect(screen.getByRole('button', { name: '10월 7일, 12' })).toBeSelected();
    expect(screen.getByRole('button', { name: '10월 6일, 12' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: '10월 9일, 휴무' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '10월 11일, 마감' })).toBeTruthy();
    expect(screen.getByText('선택')).toBeTruthy();
  });

  it('달 안 날짜를 누르면 YYYY-MM-DD를 넘긴다', async () => {
    const onSelectDay = jest.fn();
    await render(<MonthCalendar month={OCT} onMonthChange={jest.fn()} onSelectDay={onSelectDay} />);
    await fireEvent.press(screen.getByRole('button', { name: '10월 9일' }));
    expect(onSelectDay).toHaveBeenCalledWith('2026-10-09');
  });

  it('반증: 앞뒤 달 날짜는 꺼져 있고 표시 정보도 무시한다', async () => {
    const onSelectDay = jest.fn();
    await render(
      <MonthCalendar
        month={OCT}
        onMonthChange={jest.fn()}
        selected={['2026-09-30']}
        days={{ '2026-09-30': { state: 'off', caption: '휴무' } }}
        onSelectDay={onSelectDay}
      />,
    );
    const out = screen.getByRole('button', { name: '9월 30일' });
    expect(out).toBeDisabled();
    expect(out).not.toBeSelected();
    await fireEvent.press(out);
    expect(onSelectDay).not.toHaveBeenCalled();
  });

  it('이전·다음 달 버튼은 연 경계를 넘겨 넘긴다', async () => {
    const onMonthChange = jest.fn();
    await render(<MonthCalendar month={{ y: 2026, m: 12 }} onMonthChange={onMonthChange} />);
    await fireEvent.press(screen.getByRole('button', { name: '다음 달' }));
    await fireEvent.press(screen.getByRole('button', { name: '이전 달' }));
    expect(onMonthChange.mock.calls).toEqual([[{ y: 2027, m: 1 }], [{ y: 2026, m: 11 }]]);
  });
});
