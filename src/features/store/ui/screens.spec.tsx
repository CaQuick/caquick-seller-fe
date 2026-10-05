import { renderRouter, screen } from 'expo-router/testing-library';

import {
  StoreAuditLogsScreen,
  StoreFaqEditScreen,
  StoreFaqListScreen,
  StorePreviewScreen,
} from './screens';

const routes = {
  'store/faq/index': StoreFaqListScreen,
  'store/faq/[id]': StoreFaqEditScreen,
  'store/preview': StorePreviewScreen,
  'store/audit-logs': StoreAuditLogsScreen,
};

describe('매장 화면 골격', () => {
  it.each([
    ['/store/faq', 'FAQ가 없습니다'],
    ['/store/faq/new', 'FAQ 추가'],
    ['/store/faq/3', 'FAQ 수정'],
    ['/store/preview', '구매자 화면 미리보기'],
    ['/store/audit-logs', '조작 이력이 없습니다'],
  ])('%s → "%s"', async (url, text) => {
    await renderRouter(routes, { initialUrl: url });
    expect(await screen.findByText(text)).toBeTruthy();
  });
});
