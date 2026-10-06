import { type BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { type ReactNode, type RefObject, useState } from 'react';
import { Text, type TextInputProps, View } from 'react-native';

import { colors, shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { AppBottomSheet, Button, Stepper } from '@/shared/ui';

import { priceText, toDigits } from '../model/draft-form';
import { type GroupFields, type ItemFields, type OptionGroupValue } from '../model/draft-options';

interface SheetProps<T> {
  ref: RefObject<BottomSheetModal | null>;
  /** 열 때마다 올려 본문을 새로 만든다 — 닫기로 버린 입력이 남지 않게 */
  session: number;
  initial: T | null;
  onSubmit: (value: T) => void;
}

/** 시트 안 입력은 BottomSheetTextInput이어야 키보드가 시트를 밀어 올린다 */
function SheetField({
  label,
  suffix,
  multiline,
  ...input
}: { label: string; suffix?: string } & Omit<TextInputProps, 'style' | 'className'>) {
  return (
    <View className="mb-4">
      <Text className="mb-2 font-sans text-base font-semibold tracking-tight text-text2">
        {label}
      </Text>
      <View
        style={shadow.native.field}
        className={cn(
          'flex-row rounded-sm border border-border bg-surface px-3',
          multiline ? 'min-h-[80px] items-start py-3' : 'h-12 items-center',
        )}
      >
        <BottomSheetTextInput
          {...input}
          accessibilityLabel={label}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholderTextColor={colors.placeholder}
          cursorColor={colors.caret}
          selectionColor={colors.caret}
          className="flex-1 font-sans text-lg tracking-tight text-ink"
        />
        {suffix ? (
          <Text className="pl-2 font-sans text-base tracking-tight text-label">{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}

function SheetButtons({
  onClose,
  submitLabel,
  onSubmit,
  disabled,
}: {
  onClose: () => void;
  submitLabel: string;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <View className="mt-2 flex-row gap-2">
      <View style={{ flex: 1 }}>
        <Button title="취소" variant="secondary" onPress={onClose} />
      </View>
      <View style={{ flex: 1.62 }}>
        <Button
          title={submitLabel}
          disabled={disabled}
          onPress={() => {
            onSubmit();
            onClose();
          }}
        />
      </View>
    </View>
  );
}

type GroupText = Pick<GroupFields, 'name' | 'description'>;

/** 그룹 이름·안내 문구. initial이 없으면 새 그룹 */
export function GroupSheet({ ref, session, initial, onSubmit }: SheetProps<GroupText>) {
  return (
    <AppBottomSheet ref={ref} title={initial ? '옵션 그룹 수정' : '옵션 그룹 추가'}>
      <GroupBody
        key={session}
        initial={initial}
        onSubmit={onSubmit}
        onClose={() => ref.current?.dismiss()}
      />
    </AppBottomSheet>
  );
}

function GroupBody({
  initial,
  onSubmit,
  onClose,
}: Pick<SheetProps<GroupText>, 'initial' | 'onSubmit'> & { onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  return (
    <View testID="group-sheet">
      <SheetField
        label="그룹 이름"
        placeholder="예) 케이크 사이즈"
        maxLength={120}
        value={name}
        onChangeText={setName}
      />
      <SheetField
        label="안내 문구 (선택)"
        placeholder="구매자에게 보여줄 설명"
        maxLength={1000}
        multiline
        value={description}
        onChangeText={setDescription}
      />
      <SheetButtons
        onClose={onClose}
        submitLabel={initial ? '저장' : '추가'}
        disabled={!name.trim()}
        onSubmit={() => onSubmit({ name: name.trim(), description: description.trim() })}
      />
    </View>
  );
}

type ItemText = Omit<ItemFields, 'imageUrl'>;

/** 옵션 제목·설명·추가 금액. 썸네일은 행에서 바로 올린다 */
export function ItemSheet({ ref, session, initial, onSubmit }: SheetProps<ItemText>) {
  return (
    <AppBottomSheet ref={ref} title={initial ? '옵션 수정' : '옵션 추가'}>
      <ItemBody
        key={session}
        initial={initial}
        onSubmit={onSubmit}
        onClose={() => ref.current?.dismiss()}
      />
    </AppBottomSheet>
  );
}

function ItemBody({
  initial,
  onSubmit,
  onClose,
}: Pick<SheetProps<ItemText>, 'initial' | 'onSubmit'> & { onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial?.priceDelta ? String(initial.priceDelta) : '');
  return (
    <View testID="item-sheet">
      <SheetField
        label="옵션 이름"
        placeholder="예) 1호 케이크 15cm"
        maxLength={120}
        value={title}
        onChangeText={setTitle}
      />
      <SheetField
        label="설명 (선택)"
        placeholder="예) 바닐라빈 시트 + 고구마크림"
        maxLength={500}
        value={description}
        onChangeText={setDescription}
      />
      <SheetField
        label="추가 금액"
        placeholder="0"
        suffix="원"
        keyboardType="number-pad"
        value={priceText(price)}
        onChangeText={(t) => setPrice(toDigits(t).slice(0, 9))}
      />
      <SheetButtons
        onClose={onClose}
        submitLabel={initial ? '저장' : '추가'}
        disabled={!title.trim()}
        onSubmit={() =>
          onSubmit({
            title: title.trim(),
            description: description.trim(),
            priceDelta: Number(price || 0),
          })
        }
      />
    </View>
  );
}

type Range = Pick<GroupFields, 'minSelect' | 'maxSelect'>;

/** 최소·최대 선택 수. 필수 그룹은 최소 1, 최대는 옵션 수까지 */
export function RangeSheet({
  ref,
  session,
  group,
  onSubmit,
}: Omit<SheetProps<Range>, 'initial'> & { group: OptionGroupValue | null }) {
  return (
    <AppBottomSheet ref={ref} title="선택 개수">
      {group ? (
        <RangeBody
          key={session}
          group={group}
          onSubmit={onSubmit}
          onClose={() => ref.current?.dismiss()}
        />
      ) : null}
    </AppBottomSheet>
  );
}

function RangeBody({
  group,
  onSubmit,
  onClose,
}: {
  group: OptionGroupValue;
  onSubmit: (range: Range) => void;
  onClose: () => void;
}) {
  const [min, setMin] = useState(group.minSelect);
  const [max, setMax] = useState(group.maxSelect);
  const row = (label: string, stepper: ReactNode) => (
    <View className="mb-4 flex-row items-center justify-between">
      <Text className="font-sans text-lg tracking-tight text-text2">{label}</Text>
      {stepper}
    </View>
  );
  return (
    <View testID="range-sheet">
      {row(
        '최소 선택',
        <Stepper
          accessibilityLabel="최소 선택"
          value={min}
          min={group.isRequired ? 1 : 0}
          max={max}
          onChange={setMin}
        />,
      )}
      {row(
        '최대 선택',
        <Stepper
          accessibilityLabel="최대 선택"
          value={max}
          min={Math.max(1, min)}
          max={Math.max(1, group.items.length, max)}
          onChange={setMax}
        />,
      )}
      <SheetButtons
        onClose={onClose}
        submitLabel="저장"
        onSubmit={() => onSubmit({ minSelect: min, maxSelect: max })}
      />
    </View>
  );
}
