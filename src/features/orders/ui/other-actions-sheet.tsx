import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { type RefObject } from 'react';
import { View } from 'react-native';

import { AppBottomSheet, Button, MenuGroup, MenuRow } from '@/shared/ui';

export interface OtherAction {
  key: string;
  title: string;
  description: string;
  danger?: boolean;
  /** 없으면 지금 할 수 없는 항목(설명에 이유) */
  onPress?: () => void;
}

/** 확정·제작 완료 주문의 '다른 처리': 픽업 완료·노쇼·취소 */
export function OtherActionsSheet({
  ref,
  actions,
}: {
  ref: RefObject<BottomSheetModal | null>;
  actions: OtherAction[];
}) {
  return (
    <AppBottomSheet ref={ref} title="다른 처리">
      <MenuGroup>
        {actions.map(({ key, ...action }) => (
          <MenuRow key={key} {...action} />
        ))}
      </MenuGroup>
      <View className="mt-3">
        <Button title="닫기" variant="secondary" onPress={() => ref.current?.dismiss()} />
      </View>
    </AppBottomSheet>
  );
}
