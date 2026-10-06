import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Sortable from 'react-native-sortables';

import { type SellerProductManageQuery } from '@/graphql/generated/graphql';
import { messageFor } from '@/shared/api';
import { colors, shadow } from '@/shared/config/tokens';
import {
  ConfirmSheet,
  ImageDropzone,
  RemoteImage,
  showToast,
  Switch,
  TextField,
} from '@/shared/ui';

import {
  deleteTextToken,
  productManageQueryOptions,
  reorderTextTokens,
  setCustomTemplateActive,
  upsertCustomTemplate,
  upsertTextToken,
} from '../api/manage';
import { productsKeys } from '../api/queryKeys';
import { toDigits } from '../model/draft-form';
import { pickImages, uploadProductImage } from '../model/draft-images';
import {
  newSlot,
  type Rect,
  type Slot,
  slotChanged,
  slotErrors,
  TEMPLATE_COPY,
  toSlots,
  toTokenInput,
} from '../model/template-slots';
import { leaveManage, ManageFrame, ManageGate, useLeaveGuard, useProductId } from './edit-frame';
import { SlotBox } from './template-slot-box';

type Product = SellerProductManageQuery['sellerProduct'];

export function ProductCustomTemplateScreen() {
  const query = useQuery(productManageQueryOptions(useProductId()));
  return (
    <ManageGate title={TEMPLATE_COPY.title} query={query}>
      {(product) => <TemplateBody product={product} />}
    </ManageGate>
  );
}

interface Saved {
  templateId: string | null;
  baseImageUrl: string | null;
  isActive: boolean;
  slots: Slot[];
}

const sameOrder = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => b[i] === v);
const idsOf = (slots: readonly Slot[]) => slots.flatMap((s) => (s.id ? [s.id] : []));

const BASE_SIDE = 285;

/** 베이스 이미지 위 슬롯 박스 + 슬롯 카드. '저장'이 템플릿 1회 + 바뀐 슬롯만 보낸다 */
function TemplateBody({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<Saved>(() => ({
    templateId: product.customTemplate?.id ?? null,
    baseImageUrl: product.customTemplate?.baseImageUrl ?? null,
    isActive: product.customTemplate?.isActive ?? true,
    slots: toSlots(product.customTemplate?.textTokens ?? []),
  }));
  const [baseImageUrl, setBaseImageUrl] = useState(saved.baseImageUrl);
  const [isActive, setIsActive] = useState(saved.isActive);
  const [slots, setSlots] = useState(saved.slots);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [side, setSide] = useState(BASE_SIDE);
  const [removeTarget, setRemoveTarget] = useState<Slot | null>(null);
  const removeSheet = useRef<BottomSheetModal>(null);

  const deleted = saved.slots.filter((s) => !slots.some((x) => x.id === s.id));
  const savedById = new Map(saved.slots.map((s) => [s.id, s]));
  const changed = slots.filter((s) => slotChanged(s, s.id ? savedById.get(s.id) : undefined));
  const templateDirty =
    saved.templateId == null ? baseImageUrl != null : baseImageUrl !== saved.baseImageUrl;
  const dirty =
    templateDirty ||
    isActive !== saved.isActive ||
    deleted.length > 0 ||
    changed.length > 0 ||
    !sameOrder(idsOf(slots), idsOf(saved.slots));
  const errors = slotErrors(slots);
  const { back, guard } = useLeaveGuard(dirty);

  const moveSlot = useCallback(
    (key: string, update: (rect: Rect) => Rect) =>
      setSlots((list) => list.map((s) => (s.key === key ? { ...s, rect: update(s.rect) } : s))),
    [],
  );
  const patchSlot = (key: string, next: Partial<Slot>) =>
    setSlots((list) => list.map((s) => (s.key === key ? { ...s, ...next } : s)));
  const label = (slot: Slot) => slot.tokenKey || `슬롯 ${slots.indexOf(slot) + 1}`;

  const changeBase = async () => {
    const [picked] = await pickImages(1);
    if (!picked) return;
    setUploading(true);
    try {
      setBaseImageUrl(await uploadProductImage(picked));
    } catch (e) {
      showToast.error(messageFor(e));
    } finally {
      setUploading(false);
    }
  };

  /** 단계마다 저장 기준을 옮겨 두어, 실패 뒤 다시 누르면 남은 요청만 보낸다 */
  const save = async () => {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    if (!baseImageUrl) return;
    setSaving(true);
    let next = saved;
    const commit = (patch: Partial<Saved>) => {
      next = { ...next, ...patch };
      setSaved(next);
    };
    try {
      let templateId = next.templateId;
      if (templateId == null || templateDirty) {
        templateId = await upsertCustomTemplate(product.id, baseImageUrl, isActive);
        commit({ templateId, baseImageUrl, isActive });
      } else if (isActive !== next.isActive) {
        await setCustomTemplateActive(templateId, isActive);
        commit({ isActive });
      }
      for (const slot of deleted) {
        await deleteTextToken(slot.id!);
        commit({ slots: next.slots.filter((s) => s.id !== slot.id) });
      }
      let current = slots;
      for (const slot of changed) {
        const id = await upsertTextToken(toTokenInput(slot, templateId, current.indexOf(slot)));
        const stored = { ...slot, id };
        current = current.map((s) => (s.key === slot.key ? stored : s));
        setSlots(current);
        commit({
          slots: slot.id
            ? next.slots.map((s) => (s.id === id ? stored : s))
            : [...next.slots, stored],
        });
      }
      if (!sameOrder(idsOf(current), idsOf(next.slots))) {
        await reorderTextTokens(templateId, idsOf(current));
        commit({ slots: current });
      }
      showToast.success(TEMPLATE_COPY.saved);
      leaveManage();
    } catch (e) {
      showToast.error(messageFor(e));
    } finally {
      setSaving(false);
      void queryClient.invalidateQueries({ queryKey: productsKeys.detail(product.id) });
    }
  };

  const remove = (slot: Slot) => {
    if (!slot.id) {
      setSlots((list) => list.filter((s) => s.key !== slot.key));
      return;
    }
    setRemoveTarget(slot);
    removeSheet.current?.present();
  };

  return (
    <>
      <ManageFrame
        title={TEMPLATE_COPY.title}
        onBack={back}
        scrollEnabled={!dragging}
        action={{
          title: TEMPLATE_COPY.save,
          disabled: !dirty || !baseImageUrl,
          loading: saving,
          onPress: () => void save(),
        }}
      >
        <View style={shadow.native.card} className="mt-4 rounded-xl bg-surface px-4 py-2.5">
          <View className="min-h-9 flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="font-sans text-md font-medium tracking-tight text-text">
                {TEMPLATE_COPY.useTitle}
              </Text>
              <Text className="mt-0.5 font-sans text-xs tracking-tight text-muted">
                {TEMPLATE_COPY.useDescription}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              accessibilityLabel={TEMPLATE_COPY.useTitle}
            />
          </View>
        </View>
        {isActive ? null : (
          <View className="mt-4 rounded-lg bg-tint2 p-3">
            <Text className="font-sans text-sm tracking-tight text-text3">
              {TEMPLATE_COPY.offGuide}
            </Text>
          </View>
        )}
        <Text className="mb-3 mt-[18px] font-sans text-lg font-semibold tracking-tight text-text2">
          {TEMPLATE_COPY.base}
        </Text>
        {baseImageUrl ? (
          <>
            <View
              testID="template-base"
              onLayout={(e) => setSide(e.nativeEvent.layout.width)}
              className="aspect-square w-full max-w-[285px] self-center rounded-lg bg-gray2"
            >
              <RemoteImage
                accessibilityLabel={TEMPLATE_COPY.base}
                uri={baseImageUrl}
                className="h-full w-full rounded-lg"
              />
              {slots.map((slot) => (
                <SlotBox
                  key={slot.key}
                  slot={slot}
                  label={label(slot)}
                  side={side}
                  onRect={moveSlot}
                  onDragging={setDragging}
                />
              ))}
              {uploading ? (
                <View className="absolute inset-0 items-center justify-center rounded-lg bg-dim">
                  <ActivityIndicator color={colors.surface} />
                </View>
              ) : null}
            </View>
            <View className="mt-2.5 flex-row items-center justify-center">
              <Text className="font-sans text-sm tracking-tight text-sublabel">
                {`${TEMPLATE_COPY.baseHint} · `}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => void changeBase()} hitSlop={12}>
                <Text className="font-sans text-sm font-medium tracking-tight text-primary-strong">
                  {TEMPLATE_COPY.changeImage}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View>
            <ImageDropzone count={0} max={1} onPress={() => void changeBase()} />
            {uploading ? (
              <View className="mt-3">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
          </View>
        )}

        <View className="flex-row items-baseline pb-2.5 pt-6">
          <Text className="font-sans text-lg font-bold tracking-tight text-text2">
            {TEMPLATE_COPY.slots}
          </Text>
          <Text className="ml-1 font-sans text-sm tracking-tight text-muted">{slots.length}</Text>
        </View>
        <Sortable.Grid
          data={slots}
          keyExtractor={(s) => s.key}
          rowGap={12}
          onDragEnd={({ data }) => setSlots(data)}
          renderItem={({ item }) => (
            <SlotCard
              slot={item}
              label={label(item)}
              errors={showErrors ? errors[item.key] : undefined}
              onChange={(next) => patchSlot(item.key, next)}
              onRemove={() => remove(item)}
            />
          )}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="슬롯 추가"
          accessibilityState={{ disabled: !baseImageUrl }}
          disabled={!baseImageUrl}
          onPress={() => setSlots((list) => [...list, newSlot(list.length)])}
          className="mt-4 h-12 items-center justify-center rounded-sm border border-dashed border-border"
        >
          <Text className="font-sans text-base tracking-tight text-border">
            {baseImageUrl ? TEMPLATE_COPY.addSlot : TEMPLATE_COPY.needBase}
          </Text>
        </Pressable>
      </ManageFrame>
      <ConfirmSheet
        ref={removeSheet}
        title={`'${removeTarget ? label(removeTarget) : ''}' 슬롯을 삭제할까요?`}
        description="저장하면 구매자 주문 화면에서도 사라져요"
        confirmLabel="삭제하기"
        onConfirm={() => {
          if (removeTarget) setSlots((list) => list.filter((s) => s.key !== removeTarget.key));
          removeSheet.current?.dismiss();
        }}
      />
      {guard}
    </>
  );
}

/** .pcard: 치환 키·최대 글자 수 2열, 기본 문구, 필수 입력 스위치 */
function SlotCard({
  slot,
  label,
  errors,
  onChange,
  onRemove,
}: {
  slot: Slot;
  label: string;
  errors?: ReturnType<typeof slotErrors>[string];
  onChange: (next: Partial<Slot>) => void;
  onRemove: () => void;
}) {
  return (
    <View style={shadow.native.card} className="rounded-xl bg-surface p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans text-md font-bold tracking-tight text-text2">{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 슬롯 삭제`}
          onPress={onRemove}
          hitSlop={9}
          className="h-[26px] justify-center rounded-sm bg-danger-bg px-3"
        >
          <Text className="font-sans text-xs font-medium text-danger">삭제</Text>
        </Pressable>
      </View>
      <View className="flex-row gap-2.5">
        <TextField
          className="flex-1"
          sublabel="치환 키"
          accessibilityLabel={`${label} 치환 키`}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="name"
          value={slot.tokenKey}
          onChangeText={(tokenKey) => onChange({ tokenKey })}
          error={errors?.tokenKey}
        />
        <TextField
          className="flex-1"
          sublabel="최대 글자 수"
          accessibilityLabel={`${label} 최대 글자 수`}
          keyboardType="number-pad"
          alignRight
          suffix="자"
          value={slot.maxLength}
          onChangeText={(t) => onChange({ maxLength: toDigits(t).slice(0, 4) })}
          error={errors?.maxLength}
        />
      </View>
      <TextField
        className="mt-3"
        sublabel="기본 문구"
        accessibilityLabel={`${label} 기본 문구`}
        placeholder="구매자가 입력하지 않으면 쓰는 문구"
        maxLength={200}
        value={slot.defaultText}
        onChangeText={(defaultText) => onChange({ defaultText })}
        error={errors?.defaultText}
      />
      <View className="mt-2 min-h-[30px] flex-row items-center justify-between">
        <Text className="font-sans text-base tracking-tight text-muted">필수 입력</Text>
        <Switch
          value={slot.isRequired}
          onValueChange={(isRequired) => onChange({ isRequired })}
          accessibilityLabel={`${label} 필수 입력`}
        />
      </View>
    </View>
  );
}
