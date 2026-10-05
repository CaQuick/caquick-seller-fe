import { focusManager } from '@tanstack/react-query';
import { act, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { AppState } from 'react-native';

import { useSessionStore } from '@/features/auth';
import { resetSessionHooks } from '@/shared/api';
import { mockSecureStore } from '@/test/mocks';
import { restOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';

import R_layout from '../../app/_layout';
import R_app_layout from '../../app/(app)/_layout';
import R_app_tabs_layout from '../../app/(app)/(tabs)/_layout';
import R_app_tabs_chats from '../../app/(app)/(tabs)/chats';
import R_app_tabs_index from '../../app/(app)/(tabs)/index';
import R_app_tabs_orders from '../../app/(app)/(tabs)/orders';
import R_app_tabs_products from '../../app/(app)/(tabs)/products';
import R_app_tabs_store from '../../app/(app)/(tabs)/store';
import R_app_chats_conversationId from '../../app/(app)/chats/[conversationId]';
import R_app_orders_id from '../../app/(app)/orders/[id]';
import R_app_products_id_custom_template from '../../app/(app)/products/[id]/custom-template';
import R_app_products_id_edit from '../../app/(app)/products/[id]/edit';
import R_app_products_id_images from '../../app/(app)/products/[id]/images';
import R_app_products_id_index from '../../app/(app)/products/[id]/index';
import R_app_products_id_options from '../../app/(app)/products/[id]/options';
import R_app_products_new_layout from '../../app/(app)/products/new/_layout';
import R_app_products_new_basic from '../../app/(app)/products/new/basic';
import R_app_products_new_options from '../../app/(app)/products/new/options';
import R_app_products_new_preview from '../../app/(app)/products/new/preview';
import R_app_settings_change_password from '../../app/(app)/settings/change-password';
import R_app_settings_index from '../../app/(app)/settings/index';
import R_app_store_audit_logs from '../../app/(app)/store/audit-logs';
import R_app_store_basic_info from '../../app/(app)/store/basic-info';
import R_app_store_business_hours from '../../app/(app)/store/business-hours';
import R_app_store_daily_capacities from '../../app/(app)/store/daily-capacities';
import R_app_store_faq_id from '../../app/(app)/store/faq/[id]';
import R_app_store_faq_index from '../../app/(app)/store/faq/index';
import R_app_store_pickup_policy from '../../app/(app)/store/pickup-policy';
import R_app_store_preview from '../../app/(app)/store/preview';
import R_app_store_reviews_id from '../../app/(app)/store/reviews/[id]';
import R_app_store_reviews_index from '../../app/(app)/store/reviews/index';
import R_app_store_special_closures from '../../app/(app)/store/special-closures';
import R_auth_layout from '../../app/(auth)/_layout';
import R_auth_change_password from '../../app/(auth)/change-password';
import R_auth_login from '../../app/(auth)/login';

/**
 * 라우터·세션 부팅·NativeWind·RNTL 14가 jest에서 함께 도는지 — app/ 안에는 spec을 못 두므로 여기서.
 * app/ 전체를 올려 라우트 파일마다 Screen을 export하는지와 (app)/_layout의 Stack.Screen 목록이 실제 파일과 맞는지도 본다
 */
const routes = {
  _layout: R_layout,
  '(app)/_layout': R_app_layout,
  '(app)/(tabs)/_layout': R_app_tabs_layout,
  '(app)/(tabs)/chats': R_app_tabs_chats,
  '(app)/(tabs)/index': R_app_tabs_index,
  '(app)/(tabs)/orders': R_app_tabs_orders,
  '(app)/(tabs)/products': R_app_tabs_products,
  '(app)/(tabs)/store': R_app_tabs_store,
  '(app)/chats/[conversationId]': R_app_chats_conversationId,
  '(app)/orders/[id]': R_app_orders_id,
  '(app)/products/[id]/custom-template': R_app_products_id_custom_template,
  '(app)/products/[id]/edit': R_app_products_id_edit,
  '(app)/products/[id]/images': R_app_products_id_images,
  '(app)/products/[id]/index': R_app_products_id_index,
  '(app)/products/[id]/options': R_app_products_id_options,
  '(app)/products/new/_layout': R_app_products_new_layout,
  '(app)/products/new/basic': R_app_products_new_basic,
  '(app)/products/new/options': R_app_products_new_options,
  '(app)/products/new/preview': R_app_products_new_preview,
  '(app)/settings/change-password': R_app_settings_change_password,
  '(app)/settings/index': R_app_settings_index,
  '(app)/store/audit-logs': R_app_store_audit_logs,
  '(app)/store/basic-info': R_app_store_basic_info,
  '(app)/store/business-hours': R_app_store_business_hours,
  '(app)/store/daily-capacities': R_app_store_daily_capacities,
  '(app)/store/faq/[id]': R_app_store_faq_id,
  '(app)/store/faq/index': R_app_store_faq_index,
  '(app)/store/pickup-policy': R_app_store_pickup_policy,
  '(app)/store/preview': R_app_store_preview,
  '(app)/store/reviews/[id]': R_app_store_reviews_id,
  '(app)/store/reviews/index': R_app_store_reviews_index,
  '(app)/store/special-closures': R_app_store_special_closures,
  '(auth)/_layout': R_auth_layout,
  '(auth)/change-password': R_auth_change_password,
  '(auth)/login': R_auth_login,
};

const session = (mustChangePassword = false) => ({
  accessToken: 'at',
  tokenType: 'Bearer' as const,
  accountStatus: 'ACTIVE' as const,
  mustChangePassword,
  refreshToken: 'rt2',
  refreshExpiresAt: '2026-11-05T00:00:00.000Z',
});

// RNTL 14의 render는 비동기인데 renderRouter(57)는 결과 Promise에 헬퍼를 얹어 돌려준다 — async로 감싸지 않는다
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });

describe('앱 셸', () => {
  beforeEach(() =>
    useSessionStore.setState({ status: 'unknown', accessToken: null, mustChangePassword: false }),
  );
  afterEach(() => resetSessionHooks());

  it('저장된 세션이 없으면 로그인 화면으로 보낸다', async () => {
    const router = open('/');
    await router;
    expect(await screen.findByText('판매자 계정으로 로그인합니다.')).toBeTruthy();
    expect(router.getPathname()).toBe('/login');
  });

  it('refreshToken이 있으면 복원해 홈 탭을 띄우고, 세션이 끝나면 로그인으로 돌아간다', async () => {
    mockSecureStore.set('caquick.refreshToken', 'rt');
    server.use(restOk('/seller/refresh', session()));
    const router = open('/');
    await router;
    expect(await screen.findByText('오늘의 현황')).toBeTruthy();
    expect(router.getPathname()).toBe('/');
    expect(mockSecureStore.get('caquick.refreshToken')).toBe('rt2');

    await act(() => Promise.resolve(useSessionStore.getState().clear()));
    await waitFor(() => expect(router.getPathname()).toBe('/login'));
  });

  it('비밀번호 변경이 강제된 세션은 앱 대신 변경 화면으로 보낸다', async () => {
    mockSecureStore.set('caquick.refreshToken', 'rt');
    server.use(restOk('/seller/refresh', session(true)));
    const router = open('/');
    await router;
    await waitFor(() => expect(router.getPathname()).toBe('/change-password'));
    expect(screen.getByText('계속하려면 먼저 비밀번호를 바꿔야 합니다.')).toBeTruthy();
  });

  it('로그인된 상태로 로그인 화면에 오면 앱으로 보낸다', async () => {
    mockSecureStore.set('caquick.refreshToken', 'rt');
    server.use(restOk('/seller/refresh', session()));
    const router = open('/login');
    await router;
    await waitFor(() => expect(router.getPathname()).toBe('/'));
  });

  it('포그라운드 복귀를 TanStack focus로 넘긴다', async () => {
    await open('/');
    // 라우터·내비게이션도 같은 이벤트를 듣는다 — 'change' 리스너를 전부 깨운다
    const listeners = jest
      .mocked(AppState.addEventListener)
      .mock.calls.filter(([type]) => type === 'change')
      .map(([, fn]) => fn as (s: string) => void);
    expect(listeners.length).toBeGreaterThan(0);
    listeners.forEach((fn) => fn('background'));
    expect(focusManager.isFocused()).toBe(false);
    listeners.forEach((fn) => fn('active'));
    expect(focusManager.isFocused()).toBe(true);
  });
});
