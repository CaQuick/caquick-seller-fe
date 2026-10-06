import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { type RefObject, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type CategoryType } from '@/graphql/generated/graphql';
import { cn } from '@/shared/lib/cn';
import { AppBottomSheet, Button, Chip, ErrorState, SkeletonRows } from '@/shared/ui';

import { categoriesQueryOptions } from '../api/browse';
import { filterChipCategories } from '../model/browse';

export type CategoryTab = Extract<CategoryType, 'EVENT' | 'STYLE'>;
export type CategoryPick = Record<CategoryTab, string | null>;

const TABS: { value: CategoryTab; label: string }[] = [
  { value: 'EVENT', label: '이벤트별' },
  { value: 'STYLE', label: '스타일별' },
];

interface Props {
  ref: RefObject<BottomSheetModal | null>;
  /** 열 때마다 올려 본문을 새로 만든다 — 닫기로 버린 선택이 남지 않게 */
  session: number;
  initialTab: CategoryTab;
  value: CategoryPick;
  onSubmit: (value: CategoryPick) => void;
}

/** 카테고리 시트(.sheet): 탭 2개 · 탭당 칩 1개(D31) · 닫기/등록하기 */
export function CategorySheet({ ref, session, ...body }: Props) {
  return (
    <AppBottomSheet ref={ref}>
      <Body key={session} {...body} onClose={() => ref.current?.dismiss()} />
    </AppBottomSheet>
  );
}

function Body({
  initialTab,
  value,
  onSubmit,
  onClose,
}: Omit<Props, 'ref' | 'session'> & { onClose: () => void }) {
  const [tab, setTab] = useState(initialTab);
  const [pick, setPick] = useState(value);
  const query = useQuery(categoriesQueryOptions());
  const chips = filterChipCategories(query.data ?? []).filter((c) => c.categoryType === tab);

  return (
    <View testID="category-sheet">
      <View accessibilityRole="tablist" className="mb-[26px] mt-1 flex-row gap-[18px]">
        {TABS.map((t) => {
          const on = t.value === tab;
          return (
            <Pressable
              key={t.value}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: on }}
              onPress={() => setTab(t.value)}
              hitSlop={10}
            >
              <Text
                className={cn(
                  'font-sans text-2xl tracking-tight',
                  on ? 'font-semibold text-text' : 'font-medium text-muted',
                )}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <SkeletonRows count={2} />
      ) : (
        <View className="mb-[33px] flex-row flex-wrap gap-x-2 gap-y-3">
          {chips.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={pick[tab] === c.id}
              onPress={() => setPick((p) => ({ ...p, [tab]: p[tab] === c.id ? null : c.id }))}
            />
          ))}
        </View>
      )}
      <View className="-mx-[5px] flex-row gap-2">
        <View style={{ flex: 1 }}>
          <Button title="닫기" variant="secondary" onPress={onClose} />
        </View>
        <View style={{ flex: 1.62 }}>
          <Button
            title="등록하기"
            onPress={() => {
              onSubmit(pick);
              onClose();
            }}
          />
        </View>
      </View>
    </View>
  );
}
