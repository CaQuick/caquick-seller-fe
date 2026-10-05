import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { CREATE_COPY } from '../model/draft-form';
import {
  addGroup,
  addItem,
  changeGroup,
  changeItem,
  optionsError,
  removeItem,
  reorderGroups,
} from '../model/draft-options';
import { useDraftStore } from '../model/draft-store';
import { CreateFrame, saveDraftWithToast } from './create-frame';
import { OptionsEditor } from './options-editor';

/** 상품 등록 2/3 옵션 정보. 옵션 없이도 넘어갈 수 있다 */
export function ProductNewOptionsScreen() {
  const groups = useDraftStore((s) => s.draft.optionGroups);
  const set = useDraftStore((s) => s.setOptionGroups);
  const [error, setError] = useState<string | null>(null);
  const edit = (fn: Parameters<typeof set>[0]) => {
    set(fn);
    setError(null);
  };

  return (
    <CreateFrame
      step={2}
      label={CREATE_COPY.step2}
      onBack={() => router.back()}
      actions={{
        secondary: { title: CREATE_COPY.saveDraft, onPress: () => void saveDraftWithToast() },
        primary: {
          title: CREATE_COPY.next,
          onPress: () => {
            const blocked = optionsError(groups);
            if (blocked) setError(blocked);
            else router.push('/products/new/preview');
          },
        },
      }}
    >
      <View className="px-5">
        <Text className="mb-4 mt-[38px] font-sans text-3xl font-bold tracking-tighter text-ink">
          옵션 그룹
        </Text>
        <OptionsEditor
          groups={groups}
          onAddGroup={(fields) => edit((g) => addGroup(g, fields))}
          onChangeGroup={(key, patch) => edit((g) => changeGroup(g, key, patch))}
          onRemoveGroup={(key) => edit((g) => g.filter((x) => x.key !== key))}
          onReorderGroups={(keys) => edit((g) => reorderGroups(g, keys))}
          onAddItem={(key, fields) => edit((g) => addItem(g, key, fields))}
          onChangeItem={(gk, ik, patch) => edit((g) => changeItem(g, gk, ik, patch))}
          onRemoveItem={(gk, ik) => edit((g) => removeItem(g, gk, ik))}
        />
        {error ? (
          <Text accessibilityLiveRegion="polite" className="mt-3 font-sans text-xs text-danger">
            {error}
          </Text>
        ) : null}
        <Text className="mt-4 font-sans text-xs tracking-tight text-muted">
          옵션 없이도 등록할 수 있어요. 그룹을 길게 눌러 순서를 바꿉니다.
        </Text>
      </View>
    </CreateFrame>
  );
}
