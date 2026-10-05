import { fireEvent, render, screen } from '@testing-library/react-native';
import type React from 'react';
import type * as ReactNative from 'react-native';
import { Platform } from 'react-native';

import { dateToHm, hmToDate, TimeRow } from './time-row';

// 네이티브 피커 대신 props를 그대로 받는 View — spec이 onValueChange·onDismiss를 직접 부른다
jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    __esModule: true,
    default: (props: object) => createElement(View, { testID: 'time-picker', ...props }),
  };
});

describe('hmToDate·dateToHm', () => {
  it.each(['00:00', '09:05', '23:30'])('%s 왕복', (hm) => {
    expect(dateToHm(hmToDate(hm))).toBe(hm);
  });
});

describe('TimeRow', () => {
  const base = {
    label: '월',
    start: '10:00',
    end: '19:00',
    onOpenChange: jest.fn(),
    onChange: jest.fn(),
  };
  afterEach(() => jest.clearAllMocks());

  it('영업일은 시작·종료 시각을, 스위치는 영업 여부를 보인다', async () => {
    await render(<TimeRow {...base} open />);
    expect(screen.getByRole('button', { name: '월 시작 시각' })).toHaveAccessibilityValue({
      text: '10:00',
    });
    expect(screen.getByRole('button', { name: '월 종료 시각' })).toHaveAccessibilityValue({
      text: '19:00',
    });
    await fireEvent.press(screen.getByRole('switch', { name: '월 영업' }));
    expect(base.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('반증: 휴무면 시각 버튼 대신 휴무 문구', async () => {
    await render(<TimeRow {...base} label="일" sunday open={false} />);
    expect(screen.getByText('휴무')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /시각/ })).toBeNull();
    expect(screen.getByRole('switch', { name: '일 영업' })).not.toBeChecked();
  });

  it('iOS: 피커에서 고른 값은 완료를 눌러야 반영된다', async () => {
    await render(<TimeRow {...base} open minuteInterval={30} />);
    await fireEvent.press(screen.getByRole('button', { name: '월 종료 시각' }));
    expect(screen.getByRole('header', { name: '월 종료 시각' })).toBeTruthy();
    await fireEvent(screen.getByTestId('time-picker'), 'valueChange', {}, hmToDate('20:30'));
    expect(base.onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: '완료' }));
    expect(base.onChange).toHaveBeenCalledWith({ start: '10:00', end: '20:30' });
    expect(screen.queryByTestId('time-picker')).toBeNull();
  });

  it('iOS 반증: 바깥을 눌러 닫으면 바꾸지 않는다', async () => {
    await render(<TimeRow {...base} open />);
    await fireEvent.press(screen.getByRole('button', { name: '월 시작 시각' }));
    await fireEvent(screen.getByTestId('time-picker'), 'valueChange', {}, hmToDate('08:00'));
    await fireEvent.press(screen.getByLabelText('닫기'));
    expect(base.onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('time-picker')).toBeNull();
  });

  describe('Android', () => {
    beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));
    afterEach(() => jest.restoreAllMocks());

    it('대화상자에서 고르면 바로 반영하고, 취소하면 그대로 둔다', async () => {
      await render(<TimeRow {...base} open />);
      await fireEvent.press(screen.getByRole('button', { name: '월 시작 시각' }));
      await fireEvent(screen.getByTestId('time-picker'), 'valueChange', {}, hmToDate('09:30'));
      expect(base.onChange).toHaveBeenCalledWith({ start: '09:30', end: '19:00' });
      await fireEvent.press(screen.getByRole('button', { name: '월 종료 시각' }));
      await fireEvent(screen.getByTestId('time-picker'), 'dismiss');
      expect(base.onChange).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('time-picker')).toBeNull();
    });
  });
});
