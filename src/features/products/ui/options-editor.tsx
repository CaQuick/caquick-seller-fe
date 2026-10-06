import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Sortable from 'react-native-sortables';

import { messageFor } from '@/shared/api';
import { colors, shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import { ConfirmSheet, Icon, RemoteImage, showToast, Switch } from '@/shared/ui';

import { priceText, toDigits } from '../model/draft-form';
import { pickImages, uploadProductImage } from '../model/draft-images';
import {
  type GroupFields,
  type ItemFields,
  type OptionGroupValue,
  type OptionItemValue,
  rangeLabel,
  requiredPatch,
} from '../model/draft-options';
import { GroupSheet, ItemSheet, RangeSheet } from './options-editor-sheets';

export interface OptionsEditorProps {
  groups: OptionGroupValue[];
  onAddGroup: (fields: GroupFields) => void;
  onChangeGroup: (groupKey: string, patch: Partial<GroupFields>) => void;
  onRemoveGroup: (groupKey: string) => void;
  onReorderGroups: (groupKeys: string[]) => void;
  onAddItem: (groupKey: string, fields: ItemFields) => void;
  onChangeItem: (groupKey: string, itemKey: string, patch: Partial<ItemFields>) => void;
  onRemoveItem: (groupKey: string, itemKey: string) => void;
  /** 상품 관리(즉시 저장): 아이템 행에 추가 금액 입력·활성 스위치·순서 버튼을 둔다 */
  live?: boolean;
  onReorderItems?: (groupKey: string, itemKeys: string[]) => void;
}

const NEW_GROUP = { isRequired: true, minSelect: 1, maxSelect: 1 } as const;

/**
 * 옵션 그룹 카드(.grp) + 아이템 행(.item) 편집기. 값은 부모가 들고(컨트롤드) 조작은 콜백으로 알린다 —
 * 등록 2/3은 초안에 모으고, 상품 관리는 콜백마다 바로 저장한다
 */
export function OptionsEditor(props: OptionsEditorProps) {
  const { groups, onAddGroup, onChangeGroup, onRemoveGroup, onReorderGroups } = props;
  const groupSheet = useRef<BottomSheetModal>(null);
  const itemSheet = useRef<BottomSheetModal>(null);
  const rangeSheet = useRef<BottomSheetModal>(null);
  const removeSheet = useRef<BottomSheetModal>(null);
  const [session, setSession] = useState(0);
  const [groupTarget, setGroupTarget] = useState<OptionGroupValue | null>(null);
  const [itemTarget, setItemTarget] = useState<{
    groupKey: string;
    item: OptionItemValue | null;
  } | null>(null);

  const open = (sheet: typeof groupSheet) => {
    setSession((n) => n + 1);
    sheet.current?.present();
  };
  const handlers: CardHandlers = {
    editGroup: (group) => {
      setGroupTarget(group);
      open(groupSheet);
    },
    editRange: (group) => {
      setGroupTarget(group);
      open(rangeSheet);
    },
    removeGroup: (group) => {
      if (group.items.length === 0) return onRemoveGroup(group.key);
      setGroupTarget(group);
      removeSheet.current?.present();
    },
    editItem: (groupKey, item) => {
      setItemTarget({ groupKey, item });
      open(itemSheet);
    },
  };

  return (
    <View>
      <Sortable.Grid
        data={groups}
        keyExtractor={(g) => g.key}
        rowGap={12}
        onDragEnd={({ data }) => onReorderGroups(data.map((g) => g.key))}
        renderItem={({ item }) => <GroupCard group={item} handlers={handlers} editor={props} />}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="옵션 그룹 추가"
        onPress={() => {
          setGroupTarget(null);
          open(groupSheet);
        }}
        className="mt-4 h-12 items-center justify-center rounded-sm border border-dashed border-border"
      >
        <Text className="font-sans text-base tracking-tight text-border">+ 옵션 그룹 추가</Text>
      </Pressable>

      <GroupSheet
        ref={groupSheet}
        session={session}
        initial={groupTarget}
        onSubmit={(text) =>
          groupTarget ? onChangeGroup(groupTarget.key, text) : onAddGroup({ ...NEW_GROUP, ...text })
        }
      />
      <RangeSheet
        ref={rangeSheet}
        session={session}
        group={groupTarget}
        onSubmit={(range) => groupTarget && onChangeGroup(groupTarget.key, range)}
      />
      <ItemSheet
        ref={itemSheet}
        session={session}
        initial={itemTarget?.item ?? null}
        onSubmit={(fields) => {
          if (!itemTarget) return;
          if (itemTarget.item) props.onChangeItem(itemTarget.groupKey, itemTarget.item.key, fields);
          else props.onAddItem(itemTarget.groupKey, { ...fields, imageUrl: null });
        }}
      />
      <ConfirmSheet
        ref={removeSheet}
        title={`'${groupTarget?.name ?? ''}' 그룹을 삭제할까요?`}
        description={`그룹 안의 옵션 ${groupTarget?.items.length ?? 0}개도 함께 삭제돼요${props.live ? '\n이미 받은 주문의 선택 내용은 그대로 남아요' : ''}`}
        confirmLabel="삭제하기"
        onConfirm={() => {
          if (groupTarget) onRemoveGroup(groupTarget.key);
          removeSheet.current?.dismiss();
        }}
      />
    </View>
  );
}

interface CardHandlers {
  editGroup: (group: OptionGroupValue) => void;
  editRange: (group: OptionGroupValue) => void;
  removeGroup: (group: OptionGroupValue) => void;
  editItem: (groupKey: string, item: OptionItemValue | null) => void;
}

function GroupCard({
  group,
  handlers,
  editor,
}: {
  group: OptionGroupValue;
  handlers: CardHandlers;
  editor: OptionsEditorProps;
}) {
  return (
    <View
      testID={`option-group-${group.key}`}
      style={shadow.native.card}
      className="rounded-xl bg-tint px-5 py-3"
    >
      <View className="mb-2.5 flex-row items-center justify-between gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${group.name} 그룹 이름 수정`}
          onPress={() => handlers.editGroup(group)}
          className="min-h-[28px] flex-1 justify-center"
        >
          <Text className="font-sans text-lg font-semibold tracking-tight text-text">
            {group.name}
          </Text>
          {group.description ? (
            <Text numberOfLines={2} className="font-sans text-xs tracking-tight text-muted">
              {group.description}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${group.name} 그룹 삭제`}
          onPress={() => handlers.removeGroup(group)}
          hitSlop={12}
        >
          <Text className="font-sans text-xs tracking-tight text-muted">삭제</Text>
        </Pressable>
      </View>
      <View className="mb-3 flex-row flex-wrap gap-2">
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={`${group.name} 필수 선택`}
          accessibilityState={{ checked: group.isRequired }}
          onPress={() => editor.onChangeGroup(group.key, requiredPatch(group, !group.isRequired))}
          className={cn(
            'h-[37px] flex-row items-center gap-1 rounded-md border px-[13px]',
            group.isRequired ? 'border-primary bg-tint2' : 'border-chip-border bg-surface',
          )}
        >
          <Text
            className={cn(
              'font-sans text-md tracking-tight',
              group.isRequired ? 'text-primary' : 'text-text2',
            )}
          >
            필수
          </Text>
          <View
            className={cn(
              'h-[17px] w-7 justify-center rounded-full px-px',
              group.isRequired ? 'items-end bg-primary' : 'items-start bg-switch-off',
            )}
          >
            <View className="h-[14px] w-[14px] rounded-full bg-surface" />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${group.name} 선택 개수 ${rangeLabel(group)}`}
          onPress={() => handlers.editRange(group)}
          className="h-[37px] justify-center rounded-md border border-chip-border bg-surface px-[13px]"
        >
          <Text className="font-sans text-md tracking-tight text-text2">{rangeLabel(group)}</Text>
        </Pressable>
      </View>
      <View className="gap-2">
        {group.items.map((item, i) => {
          const row = {
            item,
            onEdit: () => handlers.editItem(group.key, item),
            onChange: (patch: Partial<ItemFields>) =>
              editor.onChangeItem(group.key, item.key, patch),
            onRemove: () => editor.onRemoveItem(group.key, item.key),
          };
          if (!editor.live) return <ItemRow key={item.key} {...row} />;
          const keys = group.items.map((x) => x.key);
          const move = (to: number) => () =>
            editor.onReorderItems?.(group.key, moveKey(keys, i, to));
          return (
            <LiveItemRow
              key={item.key}
              {...row}
              onUp={i > 0 ? move(i - 1) : undefined}
              onDown={i < keys.length - 1 ? move(i + 1) : undefined}
            />
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${group.name}에 옵션 추가`}
        onPress={() => handlers.editItem(group.key, null)}
        className="mt-2.5 h-11 items-center justify-center rounded-sm border border-dashed border-dash bg-surface"
      >
        <Text className="font-sans text-base tracking-tight text-muted">+ 옵션 추가</Text>
      </Pressable>
    </View>
  );
}

interface RowProps {
  item: OptionItemValue;
  onEdit: () => void;
  onChange: (patch: Partial<ItemFields>) => void;
  onRemove: () => void;
}

const moveKey = (keys: string[], from: number, to: number) => {
  const next = keys.filter((_, i) => i !== from);
  next.splice(to, 0, keys[from]!);
  return next;
};

/** 썸네일을 누르면 바로 골라 올린다 */
function ItemThumb({
  item,
  onImage,
  className,
}: {
  item: OptionItemValue;
  onImage: (imageUrl: string) => void;
  className: string;
}) {
  const [uploading, setUploading] = useState(false);
  const changeImage = async () => {
    const [picked] = await pickImages(1);
    if (!picked) return;
    setUploading(true);
    try {
      onImage(await uploadProductImage(picked));
    } catch (e) {
      showToast.error(messageFor(e));
    } finally {
      setUploading(false);
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} 이미지 ${item.imageUrl ? '변경' : '추가'}`}
      accessibilityState={{ busy: uploading, disabled: uploading }}
      disabled={uploading}
      onPress={() => void changeImage()}
      hitSlop={6}
      className={cn('items-center justify-center overflow-hidden rounded-sm bg-gray-bg', className)}
    >
      {item.imageUrl ? (
        <RemoteImage uri={item.imageUrl} className="h-full w-full" />
      ) : (
        <Icon name="add" size={14} color={colors.placeholder} />
      )}
      {uploading ? (
        <View className="absolute inset-0 items-center justify-center bg-dim">
          <ActivityIndicator size="small" color={colors.surface} />
        </View>
      ) : null}
    </Pressable>
  );
}

function RemoveButton({ title, onRemove }: { title: string; onRemove: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} 삭제`}
      onPress={onRemove}
      hitSlop={12}
      className="w-[18px] items-center"
    >
      <Text className="font-sans text-lg text-chevron">×</Text>
    </Pressable>
  );
}

function ItemRow({ item, onEdit, onChange, onRemove }: RowProps) {
  return (
    <View className="flex-row items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5">
      <ItemThumb item={item} onImage={(imageUrl) => onChange({ imageUrl })} className="h-9 w-9" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title} 수정`}
        onPress={onEdit}
        className="min-h-9 flex-1 justify-center"
      >
        <Text className="font-sans text-base tracking-tight text-text">{item.title}</Text>
        {item.description ? (
          <Text className="font-sans text-xs tracking-tight text-muted">{item.description}</Text>
        ) : null}
      </Pressable>
      <Text
        className={cn(
          'font-sans text-sm tracking-tight',
          item.priceDelta > 0 ? 'font-semibold text-purple-text' : 'text-muted',
        )}
      >
        {`+${formatNumber(item.priceDelta)}원`}
      </Text>
      <RemoveButton title={item.title} onRemove={onRemove} />
    </View>
  );
}

/** .products-item: 썸네일·이름·× 아래 줄에 추가 금액 입력(포커스가 빠질 때 저장)과 활성 스위치. 꺼지면 회색·금액 잠금 */
function LiveItemRow({
  item,
  onEdit,
  onChange,
  onRemove,
  onUp,
  onDown,
}: RowProps & { onUp?: () => void; onDown?: () => void }) {
  const active = item.isActive !== false;
  return (
    <View className="flex-row gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5">
      <ItemThumb item={item} onImage={(imageUrl) => onChange({ imageUrl })} className="h-8 w-8" />
      <View className="flex-1 gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title} 수정`}
          onPress={onEdit}
          className="min-h-8 justify-center"
        >
          <Text
            className={cn(
              'font-sans text-base tracking-tight',
              active ? 'text-text' : 'text-muted',
            )}
          >
            {item.title}
          </Text>
          {item.description ? (
            <Text className="font-sans text-xs tracking-tight text-muted">{item.description}</Text>
          ) : null}
        </Pressable>
        <View className="flex-row items-center justify-between gap-2">
          {/* 서버 값이 바뀌면(실패 롤백 포함) 입력을 새로 만든다 */}
          <PriceInput
            key={item.priceDelta}
            title={item.title}
            value={item.priceDelta}
            editable={active}
            onCommit={(priceDelta) => onChange({ priceDelta })}
          />
          <View className="flex-row items-center gap-3">
            {onUp ? <MoveButton label={`${item.title} 위로 이동`} up onPress={onUp} /> : null}
            {onDown ? <MoveButton label={`${item.title} 아래로 이동`} onPress={onDown} /> : null}
            <Switch
              value={active}
              onValueChange={(isActive) => onChange({ isActive })}
              accessibilityLabel={`${item.title} 판매`}
            />
          </View>
        </View>
      </View>
      <View className="justify-center">
        <RemoveButton title={item.title} onRemove={onRemove} />
      </View>
    </View>
  );
}

function PriceInput({
  title,
  value,
  editable,
  onCommit,
}: {
  title: string;
  value: number;
  editable: boolean;
  onCommit: (value: number) => void;
}) {
  const [digits, setDigits] = useState(String(value));
  const commit = () => {
    const next = Number(digits || 0);
    if (next !== value) onCommit(next);
  };
  return (
    <View
      className={cn(
        'h-9 w-[104px] flex-row items-center rounded-sm border px-2',
        editable ? 'border-border bg-surface' : 'border-line bg-gray2',
      )}
    >
      <TextInput
        accessibilityLabel={`${title} 추가 금액`}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        keyboardType="number-pad"
        textAlign="right"
        value={priceText(digits)}
        onChangeText={(t) => setDigits(toDigits(t).slice(0, 9))}
        onEndEditing={commit}
        cursorColor={colors.caret}
        selectionColor={colors.caret}
        className={cn(
          'flex-1 font-sans text-base tracking-tight',
          Number(digits || 0) === 0 || !editable ? 'text-muted' : 'text-ink',
        )}
      />
      <Text className="pl-1 font-sans text-base tracking-tight text-label">원</Text>
    </View>
  );
}

function MoveButton({ label, up, onPress }: { label: string; up?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      className="h-7 w-7 items-center justify-center rounded-sm bg-gray2"
      style={up ? { transform: [{ rotate: '180deg' }] } : undefined}
    >
      <Icon name="chevronDown" size={14} color={colors.label} />
    </Pressable>
  );
}
