import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';

import { homeKeys } from '@/features/home';
import { messageFor } from '@/shared/api';
import { shadow } from '@/shared/config/tokens';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import { showToast } from '@/shared/ui';

import { productsKeys } from '../api/queryKeys';
import { priceView } from '../model/browse';
import { CREATE_COPY, toPrice, uploadedUrls } from '../model/draft-form';
import { clearDraft, EMPTY_PROGRESS, type ProductDraft, useDraftStore } from '../model/draft-store';
import {
  abandonCreate,
  CreateChainError,
  type CreateStepId,
  runCreateChain,
} from '../model/draft-submit';
import { CreateFrame } from './create-frame';
import { type SubmitPhase, SubmitSheet } from './create-submit-sheet';
import { DetailGallery } from './detail-gallery';

/** 상품 등록 3/3 미리보기 + 등록 체인 */
export function ProductNewPreviewScreen() {
  const queryClient = useQueryClient();
  const draft = useDraftStore((s) => s.draft);
  const progress = useDraftStore((s) => s.progress);
  const sheet = useRef<BottomSheetModal>(null);
  const [phase, setPhase] = useState<SubmitPhase | null>(null);
  const [current, setCurrent] = useState<CreateStepId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = progress.productId != null;

  const submit = async () => {
    setPhase('running');
    setError(null);
    sheet.current?.present();
    const store = useDraftStore.getState();
    try {
      const id = await runCreateChain(store.draft, store.progress, {
        onProgress: store.setProgress,
        onStep: setCurrent,
      });
      await clearDraft();
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: homeKeys.all });
      sheet.current?.dismiss();
      showToast.success(CREATE_COPY.created);
      router.replace({ pathname: '/products/[id]', params: { id } });
    } catch (e) {
      setPhase('failed');
      setError(messageFor(e instanceof CreateChainError ? e.cause : e));
    }
  };

  const abandon = async () => {
    if (!started) {
      sheet.current?.dismiss();
      setPhase(null);
      return;
    }
    setPhase('abandoning');
    try {
      await abandonCreate(useDraftStore.getState().progress);
      useDraftStore.getState().setProgress(EMPTY_PROGRESS);
      sheet.current?.dismiss();
      setPhase(null);
      showToast.info(CREATE_COPY.abandoned);
    } catch (e) {
      setPhase('failed');
      setError(messageFor(e));
    }
  };

  // 만들다 만 상품이 있으면 되돌아가 고치지 못하게 한다 — 이어서 등록하거나 포기해야 한다
  const back = useCallback(() => {
    if (useDraftStore.getState().progress.productId != null) sheet.current?.present();
    else router.back();
    return true;
  }, []);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', back);
      return () => sub.remove();
    }, [back]),
  );

  const busy = phase === 'running' || phase === 'abandoning';
  return (
    <>
      <CreateFrame
        step={3}
        label={CREATE_COPY.step3}
        onBack={back}
        actions={{
          secondary: started
            ? {
                title: '등록 취소',
                variant: 'dangerOutline',
                disabled: busy,
                onPress: () => sheet.current?.present(),
              }
            : { title: '이전 단계', disabled: busy, onPress: back },
          primary: {
            title: started ? '이어서 등록' : '등록하기',
            loading: busy,
            onPress: () => void submit(),
          },
        }}
      >
        <PreviewCard draft={draft} />
      </CreateFrame>
      <SubmitSheet
        ref={sheet}
        phase={phase ?? 'running'}
        current={current}
        error={error}
        hasProduct={started}
        onRetry={() => void submit()}
        onAbandon={() => void abandon()}
      />
    </>
  );
}

/** 구매자 상세 레이아웃(.pv): 캐러셀·스트립·이름·가격·세그먼트·안내 박스 */
function PreviewCard({ draft }: { draft: ProductDraft }) {
  const regular = toPrice(draft.regularPrice) ?? 0;
  const { rate, original } = priceView(regular, toPrice(draft.salePrice));
  const price = original ? (toPrice(draft.salePrice) ?? 0) : regular;
  return (
    <View
      style={shadow.native.card}
      className="mx-5 mt-8 rounded-2xl bg-surface px-[25px] pb-6 pt-[22px]"
    >
      <DetailGallery urls={uploadedUrls(draft)} />
      <Text className="mb-[11px] mt-6 font-sans text-xl font-semibold tracking-tight text-ink">
        {draft.name.trim()}
      </Text>
      {original ? (
        <Text className="font-sans text-md tracking-tight text-text2">
          <Text className="line-through">{formatNumber(regular)}</Text>
          <Text className="text-xs text-label">원</Text>
        </Text>
      ) : null}
      <View className="mt-1 flex-row items-baseline">
        {rate > 0 ? (
          <Text className="mr-2 font-sans text-md font-semibold tracking-tight text-primary-strong">
            {`${rate}%`}
          </Text>
        ) : null}
        <Text className="font-sans text-lg font-bold tracking-tight text-ink">
          {formatNumber(price)}
          <Text className="text-xs font-normal text-label">원</Text>
        </Text>
      </View>
      <View className="-mx-[17px] mt-5 h-1.5 bg-line2" />
      <View accessibilityRole="tablist" className="-mx-[17px] flex-row border-b border-line2">
        <View
          accessible
          accessibilityRole="tab"
          accessibilityLabel="상품정보"
          accessibilityState={{ selected: true }}
          className="flex-1 items-center pb-[11px] pt-[13px]"
        >
          <Text className="font-sans text-base font-semibold tracking-tight text-text2">
            상품정보
          </Text>
          <View className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary" />
        </View>
        <View
          accessible
          accessibilityRole="tab"
          accessibilityLabel="후기(0)"
          accessibilityState={{ selected: false, disabled: true }}
          className="flex-1 items-center pb-[11px] pt-[13px]"
        >
          <Text className="font-sans text-base tracking-tight text-muted">후기(0)</Text>
        </View>
      </View>
      {draft.description.trim() ? (
        <Section title="상품 설명">
          <BoxText>{draft.description.trim()}</BoxText>
        </Section>
      ) : null}
      {draft.purchaseNotice.trim() ? (
        <Section title="구매 전 필독사항">
          <BoxText>{draft.purchaseNotice.trim()}</BoxText>
        </Section>
      ) : null}
      {draft.optionGroups.map((g) => (
        <Section key={g.key} title={g.name}>
          {g.description ? <BoxText className="mb-2.5">{g.description}</BoxText> : null}
          {g.items.map((item) => (
            <View key={item.key}>
              <BoxText>
                {item.title}
                {item.priceDelta > 0 ? (
                  <Text className="text-xs text-muted">{` +${formatNumber(item.priceDelta)}원`}</Text>
                ) : null}
              </BoxText>
              {item.description ? (
                <Text className="font-sans text-xs tracking-tight text-muted">
                  {item.description}
                </Text>
              ) : null}
            </View>
          ))}
        </Section>
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-[21px]">
      <Text
        accessibilityRole="header"
        className="mb-[11px] font-sans text-md font-semibold tracking-tight text-text3"
      >
        {title}
      </Text>
      <View className="rounded-lg bg-tint2 p-3">{children}</View>
    </View>
  );
}

function BoxText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text className={cn('font-sans text-sm leading-[19px] tracking-tight text-text3', className)}>
      {children}
    </Text>
  );
}
