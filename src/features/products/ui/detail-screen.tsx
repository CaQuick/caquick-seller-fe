import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ApiError, messageFor } from '@/shared/api';
import { cn } from '@/shared/lib/cn';
import {
  AppHeader,
  Button,
  Card,
  ConfirmSheet,
  ErrorState,
  KeyValue,
  MenuGroup,
  MenuRow,
  Screen,
  SectionHeader,
  SkeletonRows,
  StatusChip,
  Switch,
  TagChip,
  showToast,
} from '@/shared/ui';

import { productDetailQueryOptions } from '../api/browse';
import { BROWSE_COPY, formatPreparation, optionGroupSummary, priceView } from '../model/browse';
import { useDeleteProduct, useSetProductActive } from '../model/use-browse';
import { BuyerPreview } from './detail-buyer-preview';
import { DetailGallery } from './detail-gallery';

type SubRoute =
  | '/products/[id]/edit'
  | '/products/[id]/images'
  | '/products/[id]/options'
  | '/products/[id]/custom-template';

const backToList = () => (router.canGoBack() ? router.back() : router.replace('/products'));

export function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery(productDetailQueryOptions(id));
  const setActive = useSetProductActive();
  const remove = useDeleteProduct();
  const deleteSheet = useRef<BottomSheetModal>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const notFound = query.error instanceof ApiError && query.error.classification === 'NOT_FOUND';
  useEffect(() => {
    if (!notFound) return;
    showToast.error(BROWSE_COPY.notFound);
    backToList();
  }, [notFound]);

  const go = (pathname: SubRoute) => router.push({ pathname, params: { id } });

  const confirmDelete = () =>
    remove.mutate(id, {
      onSuccess: () => {
        deleteSheet.current?.dismiss();
        showToast.success(BROWSE_COPY.deleted);
        backToList();
      },
      onError: (error) => showToast.error(messageFor(error)),
    });

  const p = query.data;
  let body;
  if (query.isPending || notFound) {
    body = <SkeletonRows count={3} card />;
  } else if (!p) {
    body = <ErrorState onRetry={() => void query.refetch()} />;
  } else {
    const { price, original, rate } = priceView(p.regularPrice, p.salePrice);
    const template = p.customTemplate;
    body = (
      <>
        <DetailGallery urls={p.images.map((image) => image.imageUrl)} />
        <Card className="mt-4">
          <View className="mb-2 flex-row items-center justify-between gap-3">
            <Text
              accessibilityRole="header"
              className="flex-1 font-sans text-md font-bold tracking-tight text-text2"
            >
              {p.name}
            </Text>
            <Switch
              value={p.isActive}
              onValueChange={(isActive) => setActive.mutate({ productId: p.id, isActive })}
              accessibilityLabel="구매자에게 노출"
            />
          </View>
          <View className="mt-[3px] flex-row items-baseline gap-1.5">
            {rate > 0 ? (
              <Text className="font-sans text-sm font-semibold tracking-tight text-primary-strong">
                {`${rate}%`}
              </Text>
            ) : null}
            <Text className="font-sans text-lg font-bold tracking-tight text-ink">{price}</Text>
            {original ? (
              <Text className="font-sans text-sm tracking-tight text-muted line-through">
                {original}
              </Text>
            ) : null}
          </View>
          <KeyValue
            label="노출"
            value={p.isActive ? BROWSE_COPY.activeOn : BROWSE_COPY.activeOff}
          />
        </Card>

        <Card title="기본 정보" className="mt-3">
          <TextBox label="상품 설명" text={p.description} />
          <TextBox label="구매 시 유의사항" text={p.purchaseNotice} className="mt-3" />
          <View className="mt-2">
            <KeyValue label="제작 소요 시간" value={formatPreparation(p.preparationTimeMinutes)} />
          </View>
        </Card>

        <Card title="카테고리·키워드" className="mt-3">
          {p.categories.length + p.tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {p.categories.map((c) => (
                <StatusChip key={c.id} tone="purple" label={c.name} />
              ))}
              {p.tags.map((t) => (
                <TagChip key={t.id} label={`#${t.name}`} />
              ))}
            </View>
          ) : (
            <Text className="font-sans text-base tracking-tight text-muted">
              {BROWSE_COPY.noText}
            </Text>
          )}
        </Card>

        <SectionHeader
          title="옵션"
          count={p.optionGroups.length}
          action={{ label: '편집 ›', onPress: () => go('/products/[id]/options') }}
        />
        <MenuGroup>
          {p.optionGroups.length > 0 ? (
            p.optionGroups.map((g) => (
              <MenuRow
                key={g.id}
                title={g.name}
                description={optionGroupSummary(g)}
                aux={`${g.optionItems.length}개`}
                onPress={() => go('/products/[id]/options')}
              />
            ))
          ) : (
            <MenuRow
              title="옵션 그룹 추가"
              description="사이즈·맛처럼 고르는 항목이 없어요"
              onPress={() => go('/products/[id]/options')}
            />
          )}
        </MenuGroup>

        <SectionHeader title="관리" />
        <MenuGroup>
          <MenuRow
            title="이미지 관리"
            aux={`${p.images.length}장`}
            onPress={() => go('/products/[id]/images')}
          />
          <MenuRow
            title="커스텀 문구"
            description={
              template ? `문구 슬롯 ${template.textTokens.length}개` : '등록하지 않았어요'
            }
            aux={template?.isActive ? '사용 중' : '사용 안 함'}
            onPress={() => go('/products/[id]/custom-template')}
          />
          <MenuRow title="구매자 화면으로 보기" onPress={() => setPreviewOpen(true)} />
        </MenuGroup>

        <Button
          title="상품 삭제"
          variant="dangerOutline"
          onPress={() => deleteSheet.current?.present()}
          className="mt-6"
        />
      </>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader
        title="상품 상세"
        right={p ? { label: '수정', onPress: () => go('/products/[id]/edit') } : undefined}
      />
      <ScrollView contentContainerClassName="px-5 pb-10">{body}</ScrollView>
      <ConfirmSheet
        ref={deleteSheet}
        title={BROWSE_COPY.deleteTitle}
        description={BROWSE_COPY.deleteDescription}
        confirmLabel="삭제하기"
        onConfirm={confirmDelete}
        loading={remove.isPending}
      />
      <BuyerPreview productId={id} visible={previewOpen} onClose={() => setPreviewOpen(false)} />
    </Screen>
  );
}

function TextBox({
  label,
  text,
  className,
}: {
  label: string;
  text: string | null | undefined;
  className?: string;
}) {
  const filled = Boolean(text?.trim());
  return (
    <View className={className}>
      <Text className="mb-2 font-sans text-sm tracking-tight text-sublabel">{label}</Text>
      <View className="rounded-lg bg-tint2 p-3">
        <Text
          className={cn('font-sans text-sm tracking-tight', filled ? 'text-text3' : 'text-muted')}
        >
          {filled ? text : BROWSE_COPY.noText}
        </Text>
      </View>
    </View>
  );
}
