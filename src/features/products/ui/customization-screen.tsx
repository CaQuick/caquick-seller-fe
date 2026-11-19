import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type CustomModeType, type SellerProductDetailQuery } from '@/graphql/generated/graphql';
import { messageFor } from '@/shared/api';
import { shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { Button, showToast, StatusChip } from '@/shared/ui';

import { productDetailQueryOptions } from '../api/browse';
import { applyThreeDPreset, setCustomMode } from '../api/manage';
import { productsKeys } from '../api/queryKeys';
import {
  CUSTOMIZATION_COPY as COPY,
  customModeLabel,
  MODE_CARDS,
  modeIssues,
  modeSummary,
} from '../model/customization';
import { ManageFrame, ManageGate, useProductId } from './edit-frame';

type Product = SellerProductDetailQuery['sellerProduct'];

export function ProductCustomizationScreen() {
  const query = useQuery(productDetailQueryOptions(useProductId()));
  return (
    <ManageGate title={COPY.title} query={query}>
      {(product) => <CustomizationBody product={product} />}
    </ManageGate>
  );
}

/** 방식 카드 세 장. 준비 이슈가 있는 방식은 고를 수 없고, 고르면 바로 저장한다 */
function CustomizationBody({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: productsKeys.detail(product.id) });
  const setMode = useMutation({
    mutationFn: (mode: CustomModeType) => setCustomMode(product.id, mode),
    onSuccess: (_, mode) => showToast.success(COPY.changed(mode)),
    onError: (e) => showToast.error(messageFor(e)),
    onSettled: refresh,
  });
  const go = (pathname: '/products/[id]/custom-template' | '/products/[id]/options') =>
    router.push({ pathname, params: { id: product.id } });

  const extras: Partial<Record<string, ReactNode>> = {
    SLOT: (
      <LinkRow title={COPY.slotSettings} onPress={() => go('/products/[id]/custom-template')} />
    ),
    THREE_D: (
      <>
        <Text className="mt-2 font-sans text-sm tracking-tight text-text3">{COPY.noFreeEdit}</Text>
        <ThreeDPresetBox productId={product.id} className="mt-3" />
        <LinkRow title={COPY.optionSettings} onPress={() => go('/products/[id]/options')} />
      </>
    ),
  };

  return (
    <ManageFrame title={COPY.title}>
      <View className="mt-4 rounded-lg bg-tint2 p-3">
        <Text className="font-sans text-sm tracking-tight text-text3">{COPY.guide}</Text>
      </View>
      <View className="mt-4 gap-3">
        {MODE_CARDS.map(({ mode, description }) => (
          <ModeCard
            key={mode}
            mode={mode}
            description={description}
            product={product}
            busy={setMode.isPending}
            onSelect={() => setMode.mutate(mode)}
          >
            {extras[mode]}
          </ModeCard>
        ))}
      </View>
    </ManageFrame>
  );
}

function ModeCard({
  mode,
  description,
  product,
  busy,
  onSelect,
  children,
}: {
  mode: CustomModeType;
  description: string;
  product: Product;
  busy: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  const current = product.customMode === mode;
  const issues = modeIssues(product, mode);
  const summary = modeSummary(product, mode);
  const disabled = current || issues.length > 0 || busy;
  return (
    <View
      style={shadow.native.card}
      className={cn(
        'rounded-xl border bg-surface p-4',
        current ? 'border-primary' : 'border-surface',
      )}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={`${COPY.title} ${customModeLabel(mode)}`}
        accessibilityState={{ checked: current, disabled }}
        disabled={disabled}
        onPress={onSelect}
        className="min-h-8 flex-row items-center gap-3"
      >
        <View
          className={cn(
            'h-5 w-5 items-center justify-center rounded-full border-2',
            current ? 'border-primary' : 'border-border',
          )}
        >
          {current ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
        </View>
        <Text className="flex-1 font-sans text-md font-bold tracking-tight text-text2">
          {customModeLabel(mode)}
        </Text>
        {current ? <StatusChip tone="purple" label={COPY.inUse} /> : null}
      </Pressable>
      <Text className="mt-2 font-sans text-sm tracking-tight text-sublabel">{description}</Text>
      {summary ? (
        <Text className="mt-1 font-sans text-sm tracking-tight text-text3">{summary}</Text>
      ) : null}
      {issues.length > 0 ? (
        <View accessibilityLiveRegion="polite" className="mt-3 gap-1 rounded-lg bg-danger-bg p-3">
          <Text className="font-sans text-xs font-semibold tracking-tight text-danger">
            {current ? COPY.brokenNow : COPY.notReady}
          </Text>
          {issues.map((message, i) => (
            <Text key={i} className="font-sans text-xs tracking-tight text-danger">
              {`· ${message}`}
            </Text>
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** 없는 3D 카테고리마다 단일 선택 그룹을 만든다(이미 있는 그룹은 그대로) */
export function ThreeDPresetBox({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const preset = useMutation({
    mutationFn: () => applyThreeDPreset(productId),
    onSuccess: () => showToast.success(COPY.presetDone),
    onError: (e) => showToast.error(messageFor(e)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: productsKeys.detail(productId) }),
  });
  return (
    <View className={cn('rounded-lg bg-tint2 p-3', className)}>
      <Text className="font-sans text-xs tracking-tight text-sublabel">{COPY.presetHint}</Text>
      <Button
        title={COPY.preset}
        variant="secondary"
        size="sm"
        loading={preset.isPending}
        onPress={() => preset.mutate()}
        className="mt-2 self-start"
      />
    </View>
  );
}

function LinkRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="mt-3 min-h-9 flex-row items-center justify-between border-t border-line2 pt-3"
    >
      <Text className="font-sans text-base font-medium tracking-tight text-primary-strong">
        {title}
      </Text>
      <Text className="font-sans text-lg text-chevron">›</Text>
    </Pressable>
  );
}
