import { renderRouter, screen } from 'expo-router/testing-library';

import { ReviewDetailScreen, ReviewsScreen } from './screens';

describe('리뷰 화면 골격', () => {
  it.each([
    ['/store/reviews', '리뷰가 없습니다'],
    ['/store/reviews/9', '리뷰 #9의 내용을 불러옵니다.'],
  ])('%s → "%s"', async (url, text) => {
    await renderRouter(
      { 'store/reviews/index': ReviewsScreen, 'store/reviews/[id]': ReviewDetailScreen },
      { initialUrl: url },
    );
    expect(await screen.findByText(text)).toBeTruthy();
  });
});
