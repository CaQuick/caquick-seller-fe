import { type BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { type RefObject, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { AppBottomSheet, Button, TagChip } from '@/shared/ui';

import { tagSearchQueryOptions } from '../api/create';
import { addTag, MAX_TAGS, normalizeTag } from '../model/draft-form';
import { useDebouncedValue } from '../model/use-browse';

interface Props {
  ref: RefObject<BottomSheetModal | null>;
  session: number;
  value: string[];
  onSubmit: (tags: string[]) => void;
}

/** 태그 시트(.tagsheet): return·스페이스로 칩 확정, 입력 중에는 판매자 태그 검색 제안 */
export function TagSheet({ ref, session, value, onSubmit }: Props) {
  return (
    <AppBottomSheet ref={ref}>
      <Body
        key={session}
        value={value}
        onSubmit={onSubmit}
        onClose={() => ref.current?.dismiss()}
      />
    </AppBottomSheet>
  );
}

function Body({
  value,
  onSubmit,
  onClose,
}: Pick<Props, 'value' | 'onSubmit'> & { onClose: () => void }) {
  const [tags, setTags] = useState(value);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const keyword = useDebouncedValue(normalizeTag(text) ?? '');
  const search = useQuery({ ...tagSearchQueryOptions(keyword), enabled: keyword.length > 0 });

  /** 막히면(상한·길이) 입력을 그대로 두고 문구만 띄운다 */
  const commit = (raws: string[], rest = '') => {
    let next = tags;
    let failed: string | null = null;
    for (const raw of raws) {
      const result = addTag(next, raw);
      next = result.tags;
      failed = result.error ?? failed;
    }
    setTags(next);
    setError(failed);
    if (!failed) setText(rest);
    return next;
  };

  const onChangeText = (t: string) => {
    setError(null);
    if (!/\s/.test(t)) return setText(t);
    const parts = t.split(/\s+/);
    const rest = parts.pop() ?? '';
    setText(parts.join(' '));
    commit(parts, rest);
  };

  const typed = normalizeTag(text);
  const suggestions = keyword && keyword === typed ? (search.data ?? []) : [];
  const fresh = suggestions.filter((s) => !tags.includes(s.name));
  const canCreate = search.isSuccess && !suggestions.some((s) => s.isExactMatch);

  return (
    <View testID="tag-sheet" className="min-h-[360px]">
      <BottomSheetTextInput
        accessibilityLabel="태그 입력"
        value={text}
        onChangeText={onChangeText}
        onSubmitEditing={() => commit([text])}
        submitBehavior="submit"
        returnKeyType="done"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={`#태그 입력 (최대 ${MAX_TAGS}개)`}
        placeholderTextColor={colors.muted}
        cursorColor={colors.caret}
        selectionColor={colors.caret}
        className={cn(
          'mb-6 h-11 font-sans tracking-tight text-text2',
          text ? 'text-lg font-semibold' : 'text-2xl',
        )}
      />
      {typed && (fresh.length > 0 || canCreate) ? (
        <View className="mb-5 overflow-hidden rounded-md border border-line">
          {fresh.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`#${s.name} 추가`}
              onPress={() => commit([s.name])}
              className="h-11 flex-row items-center justify-between border-b border-line px-3.5"
            >
              <Text className="font-sans text-md font-semibold tracking-tight text-text2">
                {`#${s.name}`}
              </Text>
              <Text className="font-sans text-xs tracking-tight text-muted">
                {`상품 ${formatNumber(s.productCount)}개`}
              </Text>
            </Pressable>
          ))}
          {canCreate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`#${typed} 새 태그 만들기`}
              onPress={() => commit([typed])}
              className="h-11 flex-row items-center px-3.5"
            >
              <Text className="font-sans text-md font-semibold tracking-tight text-primary-strong">
                {`#${typed} 새 태그 만들기`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" className="-mt-3 mb-4 font-sans text-xs text-danger">
          {error}
        </Text>
      ) : null}
      {tags.length > 0 ? (
        <View className="mb-6 flex-row flex-wrap gap-2">
          {tags.map((t) => (
            <TagChip
              key={t}
              label={`#${t}`}
              onRemove={() => {
                setTags(tags.filter((x) => x !== t));
                setError(null);
              }}
            />
          ))}
        </View>
      ) : null}
      {tags.length > 0 || value.length > 0 ? (
        <View className="flex-row gap-2">
          <View style={{ flex: 1 }}>
            <Button title="취소" variant="secondary" onPress={onClose} />
          </View>
          <View style={{ flex: 1.62 }}>
            <Button
              title="확인"
              onPress={() => {
                onSubmit(text.trim() ? commit([text]) : tags);
                onClose();
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
