import { renderRouter, screen } from 'expo-router/testing-library';

import {
  ProductCustomTemplateScreen,
  ProductEditScreen,
  ProductImagesScreen,
  ProductOptionsScreen,
} from './screens';

const routes = {
  'products/[id]/edit': ProductEditScreen,
  'products/[id]/images': ProductImagesScreen,
  'products/[id]/options': ProductOptionsScreen,
  'products/[id]/custom-template': ProductCustomTemplateScreen,
};

describe('상품 화면 골격', () => {
  it.each([
    ['/products/7/edit', '상품 #7의 정보를 수정합니다.'],
    ['/products/7/images', '상품 이미지'],
    ['/products/7/options', '옵션 편집'],
    ['/products/7/custom-template', '커스텀 템플릿'],
  ])('%s → "%s"', async (url, text) => {
    await renderRouter(routes, { initialUrl: url });
    expect(await screen.findByText(text)).toBeTruthy();
  });
});
