import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, type RefObject, useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { colors } from '@/shared/config/tokens';
import {
  AppBottomSheet,
  Empty,
  ErrorState,
  Icon,
  MenuGroup,
  MenuRow,
  SearchBar,
  SkeletonRows,
} from '@/shared/ui';

import {
  regionGroupsQueryOptions,
  regionsQueryOptions,
  searchRegionsQueryOptions,
} from '../api/regions';

export interface RegionPick {
  name: string;
  parentName: string | null;
}

interface Props {
  ref: RefObject<BottomSheetModal | null>;
  onPick: (region: RegionPick) => void;
}

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** 시·군·구만 고른다. 검색어가 없으면 광역 → 시군구 순으로 훑는다 */
export function RegionSheet({ ref, onPick }: Props) {
  const [keyword, setKeyword] = useState('');
  const [group, setGroup] = useState<{ id: string; name: string } | null>(null);
  const term = useDebounced(keyword.trim());
  const search = useQuery({ ...searchRegionsQueryOptions(term), enabled: term.length > 0 });
  const groups = useQuery({ ...regionGroupsQueryOptions(), enabled: !term && !group });
  const regions = useQuery({ ...regionsQueryOptions(group?.id ?? ''), enabled: !term && !!group });

  const pick = (region: RegionPick) => {
    onPick(region);
    ref.current?.dismiss();
  };
  const reset = () => {
    setKeyword('');
    setGroup(null);
  };

  let rows: ReactNode[] | undefined;
  if (term) {
    rows = search.data?.map((r) =>
      r.level === 1 ? (
        <MenuRow
          key={r.id}
          title={r.name}
          description="광역 지역"
          onPress={() => {
            setKeyword('');
            setGroup({ id: r.id, name: r.name });
          }}
        />
      ) : (
        <MenuRow
          key={r.id}
          title={r.name}
          description={r.parentName ?? undefined}
          onPress={() => pick({ name: r.name, parentName: r.parentName ?? null })}
        />
      ),
    );
  } else if (group) {
    rows = regions.data?.map((r) => (
      <MenuRow
        key={r.id}
        title={r.name}
        description={group.name}
        onPress={() => pick({ name: r.name, parentName: group.name })}
      />
    ));
  } else {
    rows = groups.data
      ?.filter((g) => g.hasChildren)
      .map((g) => (
        <MenuRow key={g.id} title={g.name} onPress={() => setGroup({ id: g.id, name: g.name })} />
      ));
  }
  const active = term ? search : group ? regions : groups;

  return (
    <AppBottomSheet ref={ref} onDismiss={reset}>
      <SearchBar
        value={keyword}
        onChangeText={setKeyword}
        placeholder="지역 이름으로 검색"
        autoCorrect={false}
      />
      {group && !term ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="광역 지역 목록으로"
          onPress={() => setGroup(null)}
          className="mt-3 h-11 flex-row items-center gap-1"
        >
          <Icon name="chevronLeft" size={18} color={colors.label} />
          <Text className="font-sans text-md font-semibold tracking-tight text-text2">
            {group.name}
          </Text>
        </Pressable>
      ) : null}
      <ScrollView
        style={{ maxHeight: 360, marginTop: 12, marginBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {active.error ? (
          <ErrorState onRetry={() => void active.refetch()} />
        ) : !rows ? (
          <SkeletonRows count={3} />
        ) : rows.length === 0 ? (
          <Empty title="검색 결과가 없어요" description="다른 이름으로 찾아보세요" />
        ) : (
          <MenuGroup>{rows}</MenuGroup>
        )}
      </ScrollView>
    </AppBottomSheet>
  );
}
