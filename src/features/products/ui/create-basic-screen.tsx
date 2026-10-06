import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';

import { colors, shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { josa } from '@/shared/lib/josa';
import { formatKst } from '@/shared/lib/kst';
import { ConfirmSheet, Icon, TagChip, TextField } from '@/shared/ui';

import { categoriesQueryOptions } from '../api/browse';
import {
  basicErrors,
  CREATE_COPY,
  MAX_NAME_LENGTH,
  priceText,
  toDigits,
} from '../model/draft-form';
import {
  isPristine,
  loadDraft,
  type SavedDraft,
  useDraftOwner,
  useDraftStore,
} from '../model/draft-store';
import { type CategoryPick, CategorySheet, type CategoryTab } from './create-category-sheet';
import { CreateFrame, saveDraftWithToast } from './create-frame';
import { CreateImages } from './create-images';
import { TagSheet } from './create-tag-sheet';

const leaveFlow = () => (router.canGoBack() ? router.back() : router.replace('/products'));

/** 상품 등록 1/3 기본 정보 */
export function ProductNewBasicScreen() {
  const draft = useDraftStore((s) => s.draft);
  const patch = useDraftStore((s) => s.patch);
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState<SavedDraft | null>(null);
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('EVENT');
  const [session, setSession] = useState(0);
  const categorySheet = useRef<BottomSheetModal>(null);
  const tagSheet = useRef<BottomSheetModal>(null);
  const restoreSheet = useRef<BottomSheetModal>(null);
  const leaveSheet = useRef<BottomSheetModal>(null);
  const categories = useQuery(categoriesQueryOptions());
  const accountId = useDraftOwner();

  // 새로 들어왔을 때만 묻는다 — 2/3에서 돌아온 경우는 이미 작성 중이다
  useEffect(() => {
    if (accountId === undefined || !isPristine(useDraftStore.getState().draft)) return;
    void loadDraft(accountId).then((found) => {
      if (!found) return;
      setSaved(found);
      restoreSheet.current?.present();
    });
  }, [accountId]);

  const back = useCallback(() => {
    if (isPristine(useDraftStore.getState().draft)) leaveFlow();
    else leaveSheet.current?.present();
    return true;
  }, []);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', back);
      return () => sub.remove();
    }, [back]),
  );

  const errors = basicErrors(draft);
  const complete = Object.keys(errors).length === 0;
  const shown = (key: keyof typeof errors) => (showErrors ? errors[key] : undefined);
  const categoryName = (id: string | null) =>
    id == null ? null : (categories.data?.find((c) => c.id === id)?.name ?? null);

  const openCategory = (tab: CategoryTab) => {
    setCategoryTab(tab);
    setSession((n) => n + 1);
    categorySheet.current?.present();
  };
  const openTags = () => {
    setSession((n) => n + 1);
    tagSheet.current?.present();
  };
  const next = () => {
    if (complete) router.push('/products/new/options');
    else setShowErrors(true);
  };

  return (
    <>
      <CreateFrame
        step={1}
        label={CREATE_COPY.step1}
        onBack={back}
        actions={{
          secondary: {
            title: CREATE_COPY.saveDraft,
            onPress: () => void saveDraftWithToast(accountId),
          },
          primary: {
            title: CREATE_COPY.next,
            variant: complete ? 'primary' : 'soft',
            onPress: next,
          },
        }}
      >
        <View className="px-5">
          <CreateImages error={shown('images')} />
          <TextField
            label="상품명"
            className="mt-[42px]"
            placeholder="상품명을 입력하세요"
            maxLength={MAX_NAME_LENGTH}
            value={draft.name}
            onChangeText={(name) => patch({ name })}
            error={shown('name')}
          />
          <View className="mt-[18px] flex-row gap-2.5">
            <TextField
              label="정가"
              className="flex-1"
              placeholder="0"
              suffix="원"
              keyboardType="number-pad"
              value={priceText(draft.regularPrice)}
              onChangeText={(t) => patch({ regularPrice: toDigits(t).slice(0, 10) })}
              error={shown('regularPrice')}
            />
            <TextField
              label="할인가"
              className="flex-1"
              placeholder="선택"
              suffix="원"
              keyboardType="number-pad"
              value={priceText(draft.salePrice)}
              onChangeText={(t) => patch({ salePrice: toDigits(t).slice(0, 10) })}
              error={errors.salePrice}
            />
          </View>
          <TextField
            label="상품 설명"
            className="mt-[18px]"
            multiline
            placeholder="상품 설명을 입력하세요."
            value={draft.description}
            onChangeText={(description) => patch({ description })}
          />
          <TextField
            label="구매 시 유의사항"
            className="mt-[18px]"
            multiline
            placeholder="구매 시 유의사항을 입력하세요."
            value={draft.purchaseNotice}
            onChangeText={(purchaseNotice) => patch({ purchaseNotice })}
          />
          <Label>카테고리</Label>
          <View className="flex-row gap-2.5">
            <CategorySelect
              label="이벤트별"
              value={categoryName(draft.eventCategoryId)}
              onPress={() => openCategory('EVENT')}
            />
            <CategorySelect
              label="스타일별"
              value={categoryName(draft.styleCategoryId)}
              onPress={() => openCategory('STYLE')}
            />
          </View>
          <Label>키워드 등록</Label>
          <Keywords tags={draft.tags} onEdit={openTags} />
        </View>
      </CreateFrame>
      <CategorySheet
        ref={categorySheet}
        session={session}
        initialTab={categoryTab}
        value={{ EVENT: draft.eventCategoryId, STYLE: draft.styleCategoryId }}
        onSubmit={(pick: CategoryPick) =>
          patch({ eventCategoryId: pick.EVENT, styleCategoryId: pick.STYLE })
        }
      />
      <TagSheet
        ref={tagSheet}
        session={session}
        value={draft.tags}
        onSubmit={(tags) => patch({ tags })}
      />
      <ConfirmSheet
        ref={restoreSheet}
        tone="primary"
        title={CREATE_COPY.restoreTitle}
        description={saved ? restoreDescription(saved) : undefined}
        cancelLabel={CREATE_COPY.restoreCancel}
        confirmLabel={CREATE_COPY.restoreConfirm}
        onConfirm={() => {
          if (saved) useDraftStore.getState().restore(saved.draft);
          restoreSheet.current?.dismiss();
        }}
      />
      <ConfirmSheet
        ref={leaveSheet}
        title={CREATE_COPY.leaveTitle}
        description={CREATE_COPY.leaveDescription}
        cancelLabel={CREATE_COPY.leaveCancel}
        confirmLabel={CREATE_COPY.leaveConfirm}
        onConfirm={() => {
          leaveSheet.current?.dismiss();
          leaveFlow();
        }}
      />
    </>
  );
}

function restoreDescription({ savedAt, draft }: SavedDraft) {
  const name = draft.name.trim() || '이름 없는 상품';
  return `${formatKst(savedAt)}에 저장한 '${name}'${josa(name, '을/를')} 이어서 작성할까요?`;
}

export function Label({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-[18px] font-sans text-lg font-semibold tracking-tight text-text2">
      {children}
    </Text>
  );
}

/** .sublbl + .field.sel. 공용 SelectField는 큰 라벨이 붙어 2열 보조 라벨 모양을 직접 그린다 */
export function CategorySelect({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-2 font-sans text-sm tracking-tight text-sublabel">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 카테고리`}
        accessibilityValue={{ text: value ?? '선택 안 함' }}
        onPress={onPress}
        style={shadow.native.field}
        className="h-12 flex-row items-center justify-between rounded-sm border border-border bg-surface px-3"
      >
        <Text
          numberOfLines={1}
          className={cn(
            'flex-1 font-sans text-lg tracking-tight',
            value ? 'text-text2' : 'text-muted',
          )}
        >
          {value ?? '선택하세요'}
        </Text>
        <Icon name="chevronDown" size={16} color={colors.chevron} />
      </Pressable>
    </View>
  );
}

/** 빈 상태는 점선 안내(.kw-empty), 있으면 '# 태그' 칩(pill 예외) + 점선 원 추가 버튼 */
export function Keywords({ tags, onEdit }: { tags: string[]; onEdit: () => void }) {
  if (tags.length === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="키워드 등록"
        onPress={onEdit}
        className="h-11 w-60 justify-center rounded-sm border border-dashed border-border pl-5 pr-4"
      >
        <Text className="font-sans text-lg tracking-tight text-border">
          + 관련된 키워드를 등록해보세요
        </Text>
      </Pressable>
    );
  }
  return (
    <View className="flex-row flex-wrap items-center gap-3">
      {tags.map((t) => (
        <TagChip key={t} tone="dark" label={`# ${t}`} />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="키워드 편집"
        onPress={onEdit}
        hitSlop={10}
        className="h-6 w-6 items-center justify-center rounded-full border border-dashed border-border"
      >
        <Icon name="add" size={12} color={colors.border} />
      </Pressable>
    </View>
  );
}
