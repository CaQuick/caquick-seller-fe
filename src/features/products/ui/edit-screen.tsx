import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import {
  type SellerProductDetailQuery,
  type SellerProductsFilterCategoriesQuery,
} from '@/graphql/generated/graphql';
import { messageFor } from '@/shared/api';
import { josa } from '@/shared/lib/josa';
import { showToast, TextField } from '@/shared/ui';

import { categoriesQueryOptions, productDetailQueryOptions } from '../api/browse';
import { setProductCategories, setProductTags } from '../api/create';
import { updateProduct } from '../api/manage';
import { productsKeys } from '../api/queryKeys';
import { MAX_NAME_LENGTH, priceText, toDigits } from '../model/draft-form';
import {
  categoryIdsFor,
  EDIT_COPY,
  type EditForm,
  editErrors,
  type EditStep,
  pendingSteps,
  STEP_LABEL,
  toEditForm,
  toUpdateInput,
} from '../model/edit-form';
import { CategorySelect, Keywords, Label } from './create-basic-screen';
import { CategorySheet, type CategoryTab } from './create-category-sheet';
import { TagSheet } from './create-tag-sheet';
import { leaveManage, ManageFrame, ManageGate, useLeaveGuard, useProductId } from './edit-frame';

type Product = SellerProductDetailQuery['sellerProduct'];
type Categories = SellerProductsFilterCategoriesQuery['categories'];

/** 상품 수정: 등록 1/3 폼에 값을 채운 단일 화면. 이미지는 이미지 관리에서 바꾼다 */
export function ProductEditScreen() {
  const id = useProductId();
  const product = useQuery(productDetailQueryOptions(id));
  const categories = useQuery(categoriesQueryOptions());
  return (
    <ManageGate title={EDIT_COPY.title} query={product}>
      {(p) => (
        <ManageGate title={EDIT_COPY.title} query={categories}>
          {(list) => <EditBody product={p} categories={list} />}
        </ManageGate>
      )}
    </ManageGate>
  );
}

function EditBody({ product, categories }: { product: Product; categories: Categories }) {
  const queryClient = useQueryClient();
  const [base, setBase] = useState(() => toEditForm(product, categories));
  const [form, setForm] = useState(base);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('EVENT');
  const [session, setSession] = useState(0);
  const categorySheet = useRef<BottomSheetModal>(null);
  const tagSheet = useRef<BottomSheetModal>(null);

  const steps = pendingSteps(base, form);
  const { back, guard } = useLeaveGuard(steps.length > 0);
  const errors = editErrors(form);
  const shown = (key: keyof typeof errors) => (showErrors ? errors[key] : undefined);
  const patch = (next: Partial<EditForm>) => setForm((f) => ({ ...f, ...next }));
  const categoryName = (cid: string | null) => categories.find((c) => c.id === cid)?.name ?? null;

  const run = (step: EditStep) => {
    if (step === 'info')
      return updateProduct({ productId: product.id, ...toUpdateInput(base, form) });
    if (step === 'categories')
      return setProductCategories(product.id, categoryIdsFor(form, product, categories));
    return setProductTags(product.id, form.tags);
  };

  /** 단계마다 기준값을 옮겨 두어, 실패 뒤 다시 누르면 남은 단계만 보낸다 */
  const save = async () => {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      for (const { step, applied } of steps) {
        try {
          await run(step);
        } catch (e) {
          const label = STEP_LABEL[step];
          showToast.error(`${label}${josa(label, '을/를')} 저장하지 못했어요. ${messageFor(e)}`);
          return;
        }
        setBase((b) => ({ ...b, ...applied }));
      }
      showToast.success(EDIT_COPY.saved);
      leaveManage();
    } finally {
      setSaving(false);
      void queryClient.invalidateQueries({ queryKey: productsKeys.detail(product.id) });
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    }
  };

  const openCategory = (tab: CategoryTab) => {
    setCategoryTab(tab);
    setSession((n) => n + 1);
    categorySheet.current?.present();
  };

  return (
    <>
      <ManageFrame
        title={EDIT_COPY.title}
        onBack={back}
        action={{
          title: EDIT_COPY.save,
          disabled: steps.length === 0,
          loading: saving,
          onPress: () => void save(),
        }}
      >
        <Text className="mb-[18px] mt-[38px] font-sans text-2xl font-semibold tracking-tight text-ink">
          상품 이미지
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2.5"
        >
          {product.images.map((img, i) => (
            <Image
              key={img.id}
              accessibilityLabel={`상품 이미지 ${i + 1}`}
              source={{ uri: img.imageUrl }}
              className="h-[82px] w-[82px] rounded-thumb bg-gray2"
            />
          ))}
        </ScrollView>
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.push({ pathname: '/products/[id]/images', params: { id: product.id } })
          }
          className="mt-3 min-h-11 justify-center self-start"
        >
          <Text className="font-sans text-base font-medium tracking-tight text-primary-strong">
            {EDIT_COPY.imagesLink}
          </Text>
        </Pressable>
        <TextField
          label="상품명"
          className="mt-[18px]"
          placeholder="상품명을 입력하세요"
          maxLength={MAX_NAME_LENGTH}
          value={form.name}
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
            value={priceText(form.regularPrice)}
            onChangeText={(t) => patch({ regularPrice: toDigits(t).slice(0, 10) })}
            error={shown('regularPrice')}
          />
          <TextField
            label="할인가"
            className="flex-1"
            placeholder="선택"
            suffix="원"
            keyboardType="number-pad"
            value={priceText(form.salePrice)}
            onChangeText={(t) => patch({ salePrice: toDigits(t).slice(0, 10) })}
            error={errors.salePrice}
          />
        </View>
        <TextField
          label="상품 설명"
          className="mt-[18px]"
          multiline
          placeholder="상품 설명을 입력하세요."
          value={form.description}
          onChangeText={(description) => patch({ description })}
        />
        <TextField
          label="구매 시 유의사항"
          className="mt-[18px]"
          multiline
          placeholder="구매 시 유의사항을 입력하세요."
          value={form.purchaseNotice}
          onChangeText={(purchaseNotice) => patch({ purchaseNotice })}
        />
        <Label>카테고리</Label>
        <View className="flex-row gap-2.5">
          <CategorySelect
            label="이벤트별"
            value={categoryName(form.eventCategoryId)}
            onPress={() => openCategory('EVENT')}
          />
          <CategorySelect
            label="스타일별"
            value={categoryName(form.styleCategoryId)}
            onPress={() => openCategory('STYLE')}
          />
        </View>
        <Label>키워드 등록</Label>
        <Keywords
          tags={form.tags}
          onEdit={() => {
            setSession((n) => n + 1);
            tagSheet.current?.present();
          }}
        />
        <TextField
          label="제작 소요 시간"
          className="mt-[18px]"
          placeholder="0"
          suffix="분"
          keyboardType="number-pad"
          value={form.preparationTime}
          onChangeText={(t) => patch({ preparationTime: toDigits(t).slice(0, 5) })}
          error={shown('preparationTime')}
        />
        <Text className="mt-2 font-sans text-sm tracking-tight text-sublabel">
          {EDIT_COPY.preparationHint}
        </Text>
      </ManageFrame>
      <CategorySheet
        ref={categorySheet}
        session={session}
        initialTab={categoryTab}
        value={{ EVENT: form.eventCategoryId, STYLE: form.styleCategoryId }}
        onSubmit={(pick) => patch({ eventCategoryId: pick.EVENT, styleCategoryId: pick.STYLE })}
      />
      <TagSheet
        ref={tagSheet}
        session={session}
        value={form.tags}
        onSubmit={(tags) => patch({ tags })}
      />
      {guard}
    </>
  );
}
