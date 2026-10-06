import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { logout, useSellerMe } from '@/features/auth';
import { pushPermissionQueryOptions } from '@/features/push';
import { colors } from '@/shared/config/tokens';
import {
  Button,
  ConfirmSheet,
  Icon,
  MenuGroup,
  MenuRow,
  SectionHeader,
  StatusChip,
} from '@/shared/ui';

import { settingsStoreQueryOptions } from '../api/store-name';
import { SETTINGS_COPY as C } from '../model/copy';
import { useUpdateCheck } from '../model/use-update-check';

const VERSION = C.build(
  Constants.expoConfig?.version ?? '',
  Constants.platform?.ios?.buildNumber ??
    Constants.platform?.android?.versionCode?.toString() ??
    null,
);

/** 알림 권한 행: OS 권한을 읽기만 하고, 누르면 시스템 설정으로 보낸다 */
function PermissionRow({ granted }: { granted: boolean | undefined }) {
  const state = granted === undefined ? undefined : granted ? C.granted : C.denied;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[C.permission, state, granted === false && C.openSettings]
        .filter(Boolean)
        .join(', ')}
      onPress={() => void Linking.openSettings()}
      className="min-h-14 flex-row items-center gap-3 px-4 py-2.5"
    >
      <View className="flex-1">
        <Text className="font-sans text-md font-medium tracking-tight text-text">
          {C.permission}
        </Text>
        <Text className="mt-0.5 font-sans text-xs tracking-tight text-muted">
          {C.permissionDescription}
        </Text>
      </View>
      {state ? (
        <View className="flex-row items-center gap-2">
          <StatusChip tone={granted ? 'mint' : 'red'} label={state} />
          {granted ? null : (
            <Text className="font-sans text-base font-medium tracking-tight text-primary-strong">
              {C.openSettings}
            </Text>
          )}
        </View>
      ) : null}
      <Icon name="chevronRight" size={16} color={colors.chevron} strokeWidth={2.5} />
    </Pressable>
  );
}

/** 설정: 계정(읽기 전용 + 비밀번호 변경)·앱(버전·업데이트·알림 권한)·로그아웃 */
export function SettingsScreen() {
  const me = useSellerMe();
  const store = useQuery(settingsStoreQueryOptions());
  const permission = useQuery(pushPermissionQueryOptions());
  const update = useUpdateCheck();
  const logoutSheet = useRef<BottomSheetModal>(null);
  const [leaving, setLeaving] = useState(false);

  const confirmLogout = () => {
    setLeaving(true);
    // 끝나면 세션 가드가 로그인 화면으로 보낸다
    void logout();
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-5 pb-8">
      <SectionHeader title={C.account} />
      <MenuGroup>
        <MenuRow title={C.username} aux={me.data?.username ?? undefined} />
        <MenuRow
          title={C.displayName}
          aux={me.data?.displayName ?? me.data?.username ?? undefined}
        />
        <MenuRow title={C.storeName} aux={store.data?.storeName} />
        <MenuRow
          title={C.changePassword}
          onPress={() => router.push('/settings/change-password')}
        />
      </MenuGroup>
      <SectionHeader title={C.app} />
      <MenuGroup>
        <MenuRow title={C.version} aux={VERSION} />
        <MenuRow title={C.updateCheck} description={update.description} onPress={update.onPress} />
        <PermissionRow granted={permission.data} />
      </MenuGroup>
      <Button
        title={C.logout}
        variant="dangerOutline"
        onPress={() => logoutSheet.current?.present()}
        className="mt-7"
      />
      <Text className="mt-4 text-center font-sans text-xs tracking-tight text-muted">
        {C.contact}
      </Text>
      <ConfirmSheet
        ref={logoutSheet}
        title={C.logoutTitle}
        description={C.logoutDescription}
        confirmLabel={C.logout}
        onConfirm={confirmLogout}
        loading={leaving}
      />
    </ScrollView>
  );
}
