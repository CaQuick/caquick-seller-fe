import { renderRouter, screen } from 'expo-router/testing-library';

import {
  ProductCustomTemplateScreen,
  ProductDetailScreen,
  ProductEditScreen,
  ProductImagesScreen,
  ProductNewBasicScreen,
  ProductNewLayout,
  ProductNewOptionsScreen,
  ProductNewPreviewScreen,
  ProductOptionsScreen,
} from './screens';

const routes = {
  'products/new/_layout': ProductNewLayout,
  'products/new/basic': ProductNewBasicScreen,
  'products/new/options': ProductNewOptionsScreen,
  'products/new/preview': ProductNewPreviewScreen,
  'products/[id]/index': ProductDetailScreen,
  'products/[id]/edit': ProductEditScreen,
  'products/[id]/images': ProductImagesScreen,
  'products/[id]/options': ProductOptionsScreen,
  'products/[id]/custom-template': ProductCustomTemplateScreen,
};

describe('상품 화면 골격', () => {
  it.each([
    ['/products/new/basic', '사진·이름·가격·카테고리·태그를 입력합니다.'],
    ['/products/new/options', '옵션'],
    ['/products/new/preview', '미리보기'],
    ['/products/7', '상품 #7의 내용을 불러옵니다.'],
    ['/products/7/edit', '상품 #7의 정보를 수정합니다.'],
    ['/products/7/images', '상품 이미지'],
    ['/products/7/options', '옵션 편집'],
    ['/products/7/custom-template', '커스텀 템플릿'],
  ])('%s → "%s"', async (url, text) => {
    await renderRouter(routes, { initialUrl: url });
    expect(await screen.findByText(text)).toBeTruthy();
  });
});
