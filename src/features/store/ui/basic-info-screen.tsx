import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ApiError } from '@/shared/api';
import { colors } from '@/shared/config/tokens';
import {
  ActionBar,
  Icon,
  RemoteImage,
  Segmented,
  SelectField,
  showToast,
  TextField,
} from '@/shared/ui';

import { myStoreQueryOptions, syncSavedStore, updateBasicInfo } from '../api/my-store';
import {
  type BasicInfoValues,
  basicInfoSchema,
  buildBasicInfoPatch,
  regionFromPick,
  regionLabel,
  toBasicInfoValues,
} from '../model/basic-info';
import { pickLogo, uploadLogo } from '../model/logo';
import { STORE_COPY, storeErrorMessage } from '../model/messages';
import { FieldLabel, InfoBox, QueryGate, SubScreen } from './parts';
import { RegionSheet } from './region-sheet';

const MAP_PROVIDERS = [
  { value: 'NAVER', label: 'NAVER' },
  { value: 'KAKAO', label: 'KAKAO' },
  { value: 'NONE', label: '없음' },
] as const;

type TextKey = 'storeName' | 'storePhone' | 'websiteUrl' | 'businessHoursText' | 'greetingMessage';

function BasicInfoForm({ initial }: { initial: BasicInfoValues }) {
  const queryClient = useQueryClient();
  const regionSheet = useRef<BottomSheetModal>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [base, setBase] = useState(initial);
  const form = useForm<BasicInfoValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: initial,
  });
  const values = form.watch();
  const patch = buildBasicInfoPatch(base, values);
  const { errors } = form.formState;

  const save = useMutation({
    mutationFn: updateBasicInfo,
    onSuccess: (store) => {
      void syncSavedStore(queryClient, store);
      const next = toBasicInfoValues(store);
      setBase(next);
      form.reset(next);
      setFormError(null);
      showToast.success(STORE_COPY.saved);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.classification === 'BAD_USER_INPUT') {
        setFormError(storeErrorMessage(e));
      } else showToast.error(storeErrorMessage(e));
    },
  });

  const changeLogo = async () => {
    const image = await pickLogo();
    if (!image) return;
    setUploading(true);
    try {
      form.setValue('profileImageUrl', await uploadLogo(image), { shouldDirty: true });
    } catch (e) {
      showToast.error(storeErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const text = (
    name: TextKey,
    label: string,
    extra: Partial<Parameters<typeof TextField>[0]> = {},
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <TextField
          label={label}
          className="mt-[18px]"
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={errors[name]?.message}
          {...extra}
        />
      )}
    />
  );

  const logo = values.profileImageUrl;
  return (
    <>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-[110px]">
          {formError ? (
            <InfoBox tone="danger" className="mt-5">
              {formError}
            </InfoBox>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="로고 변경"
            accessibilityState={{ busy: uploading, disabled: uploading }}
            disabled={uploading}
            onPress={() => void changeLogo()}
            className="mt-[30px] items-center"
          >
            <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray2">
              {logo ? (
                <RemoteImage
                  accessibilityLabel="매장 로고"
                  uri={logo}
                  style={{ width: 80, height: 80 }}
                />
              ) : (
                <Icon name="store" size={30} color={colors.placeholder} />
              )}
              {uploading ? (
                <View className="absolute inset-0 items-center justify-center bg-dim">
                  <ActivityIndicator color={colors.surface} />
                </View>
              ) : null}
            </View>
            <Text className="mt-2.5 font-sans text-base font-medium tracking-tight text-primary-strong">
              {uploading ? STORE_COPY.logoUploading : '로고 변경'}
            </Text>
          </Pressable>
          {text('storeName', '매장명')}
          {text('storePhone', '전화번호', { keyboardType: 'phone-pad' })}
          <SelectField
            label="주소"
            className="mt-[18px]"
            value={regionLabel(values.region)}
            placeholder="지역을 선택하세요"
            onPress={() => regionSheet.current?.present()}
          />
          <Controller
            control={form.control}
            name="addressFull"
            render={({ field }) => (
              <TextField
                className="mt-2"
                accessibilityLabel="상세 주소"
                placeholder="상세 주소"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.addressFull?.message}
              />
            )}
          />
          <FieldLabel>지도 제공자</FieldLabel>
          <Segmented
            items={MAP_PROVIDERS}
            value={values.mapProvider}
            onChange={(v) => form.setValue('mapProvider', v, { shouldDirty: true })}
            accessibilityLabel="지도 제공자"
          />
          {text('websiteUrl', '웹사이트', {
            keyboardType: 'url',
            autoCapitalize: 'none',
            placeholder: 'instagram.com/매장',
          })}
          {text('businessHoursText', '영업시간 안내 문구', { multiline: true })}
          {text('greetingMessage', '인사말', {
            multiline: true,
            placeholder: STORE_COPY.greetingHint,
          })}
        </ScrollView>
      </KeyboardAvoidingView>
      <ActionBar
        primary={{
          title: '저장',
          disabled: uploading || Object.keys(patch).length === 0,
          loading: save.isPending,
          onPress: () => void form.handleSubmit(() => save.mutate(patch))(),
        }}
      />
      <RegionSheet
        ref={regionSheet}
        onPick={(pick) => form.setValue('region', regionFromPick(pick), { shouldDirty: true })}
      />
    </>
  );
}

/** 기본 정보: 로고·매장명·전화·주소(지역 시트 + 상세)·지도·웹사이트·안내 문구·인사말. 바뀐 필드만 저장 */
export function StoreBasicInfoScreen() {
  const store = useQuery(myStoreQueryOptions());
  return (
    <SubScreen title="기본 정보" actionBar={!!store.data}>
      {store.data ? (
        <BasicInfoForm key={store.data.id} initial={toBasicInfoValues(store.data)} />
      ) : (
        <QueryGate
          isPending={store.isPending}
          error={store.error}
          onRetry={() => void store.refetch()}
        />
      )}
    </SubScreen>
  );
}
