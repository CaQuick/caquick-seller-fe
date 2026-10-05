import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Text } from 'react-native';

import { ConfirmSheet } from './confirm-sheet';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));

const REASONS = [
  { value: 'closed', label: '해당 날짜 제작 마감' },
  { value: 'stock', label: '재료 수급 불가' },
] as const;

describe('ConfirmSheet', () => {
  it('사유를 라디오로 고르고 확정한다', async () => {
    const ref = createRef<BottomSheetModal>();
    const onSelect = jest.fn();
    const onConfirm = jest.fn();
    await render(
      <ConfirmSheet
        ref={ref}
        title="주문을 거절할까요?"
        description="구매자에게 거절 사유가 전달되고 결제가 취소돼요"
        options={REASONS}
        selected="closed"
        onSelect={onSelect}
        confirmLabel="거절하기"
        onConfirm={onConfirm}
      >
        <Text>직접 입력</Text>
      </ConfirmSheet>,
    );
    expect(screen.getByRole('header', { name: '주문을 거절할까요?' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '해당 날짜 제작 마감' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '재료 수급 불가' })).not.toBeChecked();
    expect(screen.getByText('직접 입력')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '재료 수급 불가' }));
    expect(onSelect).toHaveBeenCalledWith('stock');
    await fireEvent.press(screen.getByRole('button', { name: '거절하기' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('닫기는 시트를 내리고 확정을 부르지 않는다', async () => {
    const ref = createRef<BottomSheetModal>();
    const onConfirm = jest.fn();
    await render(
      <ConfirmSheet
        ref={ref}
        title="로그아웃할까요?"
        confirmLabel="로그아웃"
        onConfirm={onConfirm}
      />,
    );
    const dismiss = jest.spyOn(ref.current!, 'dismiss');
    expect(screen.queryByRole('radiogroup')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('반증: confirmDisabled면 확정이 눌리지 않는다', async () => {
    const ref = createRef<BottomSheetModal>();
    const onConfirm = jest.fn();
    await render(
      <ConfirmSheet
        ref={ref}
        title="주문을 취소할까요?"
        tone="primary"
        confirmLabel="취소 확정"
        confirmDisabled
        onConfirm={onConfirm}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '취소 확정' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
