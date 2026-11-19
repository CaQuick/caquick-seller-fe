import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { type SellerStoreSettlementAccountQuery } from '@/graphql/generated/graphql';
import { ApiError } from '@/shared/api';
import { ActionBar, Card, KeyValue, SelectField, showToast, TextField } from '@/shared/ui';

import { storeKeys } from '../api/queryKeys';
import { settlementAccountQueryOptions, upsertSettlementAccount } from '../api/settlement';
import { formatAuditAt } from '../model/audit';
import {
  ACCOUNT_COPY,
  ACCOUNT_HOLDER_MAX,
  accountErrorMessage,
  type AccountForm,
  checkAccountForm,
  EMPTY_ACCOUNT_FORM,
  updatedByLabel,
} from '../model/settlement-account';
import { BankSheet } from './bank-sheet';
import { FieldLabel, InfoBox, QueryGate, SubScreen } from './parts';

type Saved = SellerStoreSettlementAccountQuery['sellerSettlementAccount'];

function SavedAccount({ account }: { account: NonNullable<Saved> }) {
  return (
    <>
      <FieldLabel first>현재 정산 계좌</FieldLabel>
      <Card>
        <KeyValue label="은행" value={account.bank.name} />
        <KeyValue label="계좌번호" value={account.accountNumberMasked} />
        <KeyValue label="예금주" value={account.accountHolder} />
        <KeyValue
          label="마지막 수정"
          value={`${updatedByLabel(account.updatedByRole)} · ${formatAuditAt(account.updatedAt)}`}
        />
      </Card>
      {account.updatedByRole === 'ADMIN' ? (
        <InfoBox className="mt-3">{ACCOUNT_COPY.byAdmin}</InfoBox>
      ) : null}
    </>
  );
}

/** 계좌번호 원문은 저장 요청에만 싣는다. 응답(끝 4자리)만 캐시에 두고, 성공하면 폼과 요청 기록을 바로 비운다 */
function AccountEditor({ saved }: { saved: Saved }) {
  const queryClient = useQueryClient();
  const bankSheet = useRef<BottomSheetModal>(null);
  const [form, setForm] = useState<AccountForm>(EMPTY_ACCOUNT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const set = (patch: Partial<AccountForm>) => setForm((f) => ({ ...f, ...patch }));
  const { input, numberError } = checkAccountForm(form);

  const save = useMutation({ mutationFn: upsertSettlementAccount, gcTime: 0 });
  const submit = () => {
    if (!input) return;
    save.mutate(input, {
      onSuccess: (account) => {
        setForm(EMPTY_ACCOUNT_FORM);
        setFormError(null);
        save.reset();
        queryClient.setQueryData(storeKeys.settlementAccount(), account);
        showToast.success(ACCOUNT_COPY.saved);
      },
      onError: (e) => {
        if (e instanceof ApiError && e.classification === 'BAD_USER_INPUT') {
          setFormError(accountErrorMessage(e));
        } else showToast.error(accountErrorMessage(e));
      },
    });
  };

  return (
    <>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-[110px]">
          {saved ? (
            <SavedAccount account={saved} />
          ) : (
            <InfoBox className="mt-5">{ACCOUNT_COPY.missing}</InfoBox>
          )}
          <FieldLabel>{saved ? '계좌 바꾸기' : '계좌 등록'}</FieldLabel>
          {formError ? (
            <InfoBox tone="danger" className="mb-3">
              {formError}
            </InfoBox>
          ) : null}
          <SelectField
            label="은행"
            value={form.bank?.name}
            placeholder="은행을 골라 주세요"
            onPress={() => bankSheet.current?.present()}
          />
          <TextField
            label="계좌번호"
            sublabel={ACCOUNT_COPY.numberHint}
            keyboardType="number-pad"
            autoComplete="off"
            autoCorrect={false}
            maxLength={30}
            value={form.accountNumber}
            onChangeText={(accountNumber) => set({ accountNumber })}
            error={numberError}
            className="mt-5"
          />
          <TextField
            label="예금주"
            maxLength={ACCOUNT_HOLDER_MAX}
            autoCorrect={false}
            value={form.accountHolder}
            onChangeText={(accountHolder) => set({ accountHolder })}
            className="mt-5"
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ActionBar
        primary={{
          title: '저장',
          disabled: !input,
          loading: save.isPending,
          onPress: submit,
        }}
      />
      <BankSheet
        ref={bankSheet}
        selected={form.bank?.code ?? null}
        onPick={(bank) => set({ bank })}
      />
    </>
  );
}

/** 정산 계좌: 현재 계좌(끝 4자리·마지막 수정 주체) + 새 계좌 입력 */
export function StoreSettlementAccountScreen() {
  const account = useQuery(settlementAccountQueryOptions());
  return (
    <SubScreen title="정산 계좌" actionBar={account.isSuccess}>
      {account.isSuccess ? (
        <AccountEditor saved={account.data} />
      ) : (
        <QueryGate
          isPending={account.isPending}
          error={account.error}
          onRetry={() => void account.refetch()}
        />
      )}
    </SubScreen>
  );
}
