import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { type RefObject } from 'react';
import { View } from 'react-native';

import { AppBottomSheet, Button, MenuGroup, MenuRow } from '@/shared/ui';

import { CHATS_COPY } from '../model/copy';

interface Props {
  ref: RefObject<BottomSheetModal | null>;
  onAutoReply: () => void;
  /** 이 구매자의 최근 주문 요약. 없으면 주문 보기를 숨긴다 */
  orderSummary: string | null;
  onOrder: () => void;
}

/** ⋯ 메뉴 시트: 자동응답 관리 · 주문 보기 · 닫기 */
export function RoomMenuSheet({ ref, onAutoReply, orderSummary, onOrder }: Props) {
  return (
    <AppBottomSheet ref={ref}>
      <MenuGroup>
        <MenuRow
          icon="autoReply"
          title={CHATS_COPY.menuAutoReply}
          description={CHATS_COPY.menuAutoReplyDescription}
          onPress={onAutoReply}
        />
        {orderSummary ? (
          <MenuRow
            icon="orders"
            title={CHATS_COPY.menuOrder}
            description={orderSummary}
            onPress={onOrder}
          />
        ) : null}
      </MenuGroup>
      <View className="mt-3">
        <Button
          title={CHATS_COPY.close}
          variant="secondary"
          onPress={() => ref.current?.dismiss()}
        />
      </View>
    </AppBottomSheet>
  );
}
