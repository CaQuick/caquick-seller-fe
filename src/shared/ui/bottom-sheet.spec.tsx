import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Text } from 'react-native';

import { AppBottomSheet } from './bottom-sheet';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));

describe('AppBottomSheet', () => {
  it('제목(헤더)과 내용을 그리고 ref로 present·dismiss할 수 있다', async () => {
    const ref = createRef<BottomSheetModal>();
    await render(
      <AppBottomSheet ref={ref} title="정렬">
        <Text>최신순</Text>
      </AppBottomSheet>,
    );
    expect(screen.getByRole('header', { name: '정렬' })).toBeTruthy();
    expect(screen.getByText('최신순')).toBeTruthy();
    expect(ref.current).not.toBeNull();
    expect(() => {
      ref.current!.present();
      ref.current!.dismiss();
    }).not.toThrow();
  });

  it('제목이 없으면 헤더를 그리지 않는다', async () => {
    await render(
      <AppBottomSheet>
        <Text>내용</Text>
      </AppBottomSheet>,
    );
    expect(screen.queryByRole('header')).toBeNull();
  });
});
