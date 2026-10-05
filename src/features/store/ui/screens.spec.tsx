import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import {
  StoreAuditLogsScreen,
  StoreBasicInfoScreen,
  StoreBusinessHoursScreen,
  StoreDailyCapacitiesScreen,
  StoreFaqEditScreen,
  StoreFaqListScreen,
  StoreMenuScreen,
  StorePickupPolicyScreen,
  StorePreviewScreen,
  StoreSpecialClosuresScreen,
} from './screens';

const routes = {
  store: StoreMenuScreen,
  'store/basic-info': StoreBasicInfoScreen,
  'store/business-hours': StoreBusinessHoursScreen,
  'store/special-closures': StoreSpecialClosuresScreen,
  'store/pickup-policy': StorePickupPolicyScreen,
  'store/daily-capacities': StoreDailyCapacitiesScreen,
  'store/faq/index': StoreFaqListScreen,
  'store/faq/[id]': StoreFaqEditScreen,
  'store/preview': StorePreviewScreen,
  'store/audit-logs': StoreAuditLogsScreen,
};

describe('매장 화면 골격', () => {
  it.each([
    ['/store/basic-info', '기본 정보'],
    ['/store/business-hours', '영업시간'],
    ['/store/special-closures', '특별휴무'],
    ['/store/pickup-policy', '픽업 정책'],
    ['/store/daily-capacities', '일별 생산 수량'],
    ['/store/faq', 'FAQ가 없습니다'],
    ['/store/faq/new', 'FAQ 추가'],
    ['/store/faq/3', 'FAQ 수정'],
    ['/store/preview', '구매자 화면 미리보기'],
    ['/store/audit-logs', '조작 이력이 없습니다'],
  ])('%s → "%s"', async (url, text) => {
    await renderRouter(routes, { initialUrl: url });
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it('매장 탭 메뉴에서 하위 화면으로 이동한다', async () => {
    const router = renderRouter(routes, { initialUrl: '/store' });
    await router;
    await fireEvent.press(screen.getByRole('link', { name: /영업시간/ }));
    await waitFor(() => expect(router.getPathname()).toBe('/store/business-hours'));
  });
});
