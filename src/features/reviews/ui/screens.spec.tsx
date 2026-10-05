import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { graphql, HttpResponse } from 'msw';

import { useSessionStore } from '@/features/auth';
import { gqlError, gqlOk } from '@/test/msw/graphql';
import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { ReviewDetailScreen, ReviewsScreen } from './screens';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual<object>('@gorhom/bottom-sheet/mock'));

const ME = {
  sellerMe: {
    accountId: '1',
    username: 'haz',
    displayName: '해즈',
    storeId: '3',
    mustChangePassword: false,
    accountStatus: 'ACTIVE',
  },
};

const review = (id: string, rating: number, patch: object = {}) => ({
  id,
  rating,
  content: `리뷰 본문 ${id}`,
  media: [],
  likeCount: Number(id),
  authorNickname: `구매자${id}`,
  productName: '크리스마스 눈사람',
  createdAt: '2026-10-02T15:30:00.000Z',
  ...patch,
});
const ALL = [
  review('1', 5, {
    media: [
      { mediaType: 'IMAGE', mediaUrl: 'https://cdn/a.jpg', thumbnailUrl: null, sortOrder: 0 },
    ],
  }),
  review('2', 4, { authorNickname: null }),
  review('3', 5),
];

interface ListInput {
  photoOnly: boolean;
  sort: string;
  cursor: string | null;
}
function reviews(pick: (input: ListInput) => ReturnType<typeof review>[] = () => ALL, total = 3) {
  const calls: ListInput[] = [];
  server.use(
    graphql.query('SellerReviewsList', ({ variables }) => {
      const input = variables.input as ListInput;
      calls.push(input);
      const items = pick(input);
      return HttpResponse.json({
        data: {
          storeReviews: {
            items,
            totalCount: input.photoOnly ? items.length : total,
            photoTotalCount: 1,
            hasMore: false,
            nextCursor: null,
          },
        },
      });
    }),
  );
  return calls;
}
const rating = () =>
  gqlOk('SellerStoreRating', { storeDetail: { id: '3', ratingAverage: 4.7, reviewCount: 3 } });

const routes = {
  'store/reviews/index': ReviewsScreen,
  'store/reviews/[id]': ReviewDetailScreen,
  'products/[id]/index': () => null,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl, wrapper: Providers });

beforeEach(() => {
  useSessionStore.setState({
    status: 'authenticated',
    accessToken: 'at',
    mustChangePassword: false,
  });
  server.use(gqlOk('SellerAuthMe', ME));
});

describe('리뷰 목록', () => {
  it('평점 요약과 불러온 리뷰 기준 분포, 카드를 그린다', async () => {
    server.use(rating());
    const calls = reviews();
    await open('/store/reviews');
    expect(await screen.findByText('평점 요약')).toBeTruthy();
    expect(await screen.findByLabelText('평균 별점 4.7점')).toBeTruthy();
    expect(screen.getByText('리뷰 3개')).toBeTruthy();
    expect(screen.getByText('사진 리뷰 1개')).toBeTruthy();
    expect(screen.getByLabelText('5점 2개')).toBeTruthy();
    expect(screen.getByLabelText('4점 1개')).toBeTruthy();
    expect(screen.getByText('최근 3개 기준')).toBeTruthy();
    expect(await screen.findByText('리뷰 본문 1')).toBeTruthy();
    expect(screen.getByLabelText('리뷰 사진 1')).toBeTruthy();
    expect(screen.getByText('탈퇴한 사용자')).toBeTruthy();
    expect(screen.getAllByText('2026.10.03')).toHaveLength(3);
    expect(screen.getByText('좋아요 3')).toBeTruthy();
    expect(calls[0]).toEqual({
      storeId: '3',
      photoOnly: false,
      sort: 'LATEST',
      cursor: null,
      limit: 20,
    });
  });

  it('사진만·정렬을 바꾸면 그 조건으로 다시 부르고 요약은 그대로 둔다', async () => {
    server.use(rating());
    const calls = reviews((input) => (input.photoOnly ? ALL.slice(0, 1) : ALL));
    await open('/store/reviews');
    await screen.findByText('리뷰 본문 3');

    await fireEvent.press(screen.getByRole('button', { name: '사진만' }));
    await waitFor(() => expect(screen.queryByText('리뷰 본문 3')).toBeNull());
    expect(calls.at(-1)).toMatchObject({ photoOnly: true, sort: 'LATEST' });
    expect(screen.getByText('최근 3개 기준')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '최신순 ›' }));
    await fireEvent.press(screen.getByRole('radio', { name: '좋아요순' }));
    await waitFor(() => expect(calls.at(-1)).toMatchObject({ photoOnly: true, sort: 'LIKES' }));
    expect(await screen.findByRole('button', { name: '좋아요순 ›' })).toBeTruthy();
  });

  it('사진 리뷰가 없으면 목록 자리만 비운다', async () => {
    server.use(rating());
    reviews((input) => (input.photoOnly ? [] : ALL));
    await open('/store/reviews');
    await screen.findByText('리뷰 본문 1');
    await fireEvent.press(screen.getByRole('button', { name: '사진만' }));
    expect(await screen.findByText('사진 리뷰가 없어요')).toBeTruthy();
    expect(screen.getByText('평점 요약')).toBeTruthy();
  });

  it('리뷰가 없으면 요약 없이 빈 상태만', async () => {
    server.use(rating());
    reviews(() => [], 0);
    await open('/store/reviews');
    expect(await screen.findByText('아직 리뷰가 없어요')).toBeTruthy();
    expect(screen.queryByText('평점 요약')).toBeNull();
  });

  it('비공개 매장은 평균만 빼고 요약한다', async () => {
    server.use(
      gqlError('SellerStoreRating', {
        message: '매장을 찾을 수 없습니다.',
        code: 'STORE_NOT_FOUND',
        classification: 'NOT_FOUND',
        statusCode: 404,
      }),
    );
    reviews();
    await open('/store/reviews');
    expect(await screen.findByText('리뷰 3개')).toBeTruthy();
    await waitFor(() => expect(screen.queryByLabelText(/^평균 별점/)).toBeNull());
  });

  it('끝까지 내리면 다음 커서로 이어 붙인다', async () => {
    server.use(rating());
    const cursors: (string | null)[] = [];
    server.use(
      graphql.query('SellerReviewsList', ({ variables }) => {
        const { cursor } = variables.input as ListInput;
        cursors.push(cursor);
        return HttpResponse.json({
          data: {
            storeReviews: {
              items: cursor ? [review('4', 3)] : ALL,
              totalCount: 4,
              photoTotalCount: 1,
              hasMore: !cursor,
              nextCursor: cursor ? null : 'r3',
            },
          },
        });
      }),
    );
    await open('/store/reviews');
    await screen.findByText('리뷰 본문 3');
    await fireEvent(screen.getByTestId('reviews-list'), 'onEndReached');
    expect(await screen.findByText('리뷰 본문 4')).toBeTruthy();
    expect(cursors).toEqual([null, 'r3']);
    expect(screen.getByText('최근 4개 기준')).toBeTruthy();
  });

  it('카드를 누르면 리뷰 상세로 간다', async () => {
    server.use(
      rating(),
      gqlError('SellerReviewsDetail', { message: '없음', classification: 'NOT_FOUND' }),
    );
    reviews();
    const router = open('/store/reviews');
    await router;
    await fireEvent.press(await screen.findByRole('button', { name: '구매자3의 리뷰 상세' }));
    await waitFor(() => expect(router.getPathname()).toBe('/store/reviews/3'));
  });

  it('목록을 못 받으면 다시 시도를 보여 준다', async () => {
    server.use(
      rating(),
      graphql.query('SellerReviewsList', () => HttpResponse.json({}, { status: 500 })),
    );
    await open('/store/reviews');
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeTruthy();
  });

  it('매장이 없는 계정은 빈 상태', async () => {
    server.use(gqlOk('SellerAuthMe', { sellerMe: { ...ME.sellerMe, storeId: null } }));
    await open('/store/reviews');
    expect(await screen.findByText('아직 리뷰가 없어요')).toBeTruthy();
  });
});

describe('리뷰 상세', () => {
  const DETAIL = {
    reviewDetail: {
      review: {
        ...review('9', 5),
        content: '아이가 눈사람 얼굴 보고 너무 좋아했어요.',
        commentCount: 3,
        customOptions: [{ groupName: '크기', optionTitle: '1호 15cm' }],
      },
      product: {
        productId: '77',
        name: '크리스마스 눈사람',
        thumbnailUrl: null,
        regularPrice: 35000,
        salePrice: 33000,
      },
    },
  };
  function comments() {
    const calls: { cursor: string | null }[] = [];
    server.use(
      graphql.query('SellerReviewsComments', ({ variables }) => {
        const input = variables.input as { cursor: string | null };
        calls.push(input);
        const first = input.cursor === null;
        return HttpResponse.json({
          data: {
            reviewComments: {
              items: first
                ? [
                    {
                      id: 'c1',
                      content: '크기 어땠나요?',
                      authorNickname: '최유진',
                      createdAt: '2026-10-04T00:00:00.000Z',
                    },
                    {
                      id: 'c2',
                      content: '4명이 딱 좋아요',
                      authorNickname: '김다은',
                      createdAt: '2026-10-04T01:00:00.000Z',
                    },
                  ]
                : [
                    {
                      id: 'c3',
                      content: '감사합니다',
                      authorNickname: null,
                      createdAt: '2026-10-05T00:00:00.000Z',
                    },
                  ],
              totalCount: 3,
              hasMore: first,
              nextCursor: first ? 'c2' : null,
            },
          },
        });
      }),
    );
    return calls;
  }

  it('상품 행·리뷰 전문·댓글을 읽기 전용으로 보여 주고 더보기로 이어 붙인다', async () => {
    server.use(gqlOk('SellerReviewsDetail', DETAIL));
    const calls = comments();
    const router = open('/store/reviews/9');
    await router;
    expect(await screen.findByText('아이가 눈사람 얼굴 보고 너무 좋아했어요.')).toBeTruthy();
    expect(screen.getByText('1호 15cm · 33,000원')).toBeTruthy();
    expect(await screen.findByText('크기 어땠나요?')).toBeTruthy();
    expect(screen.getByText(/판매자는 읽기만 할 수 있어요/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '댓글 더보기' }));
    expect(await screen.findByText('감사합니다')).toBeTruthy();
    expect(calls.at(-1)).toEqual({ reviewId: '9', cursor: 'c2', limit: 20 });

    await fireEvent.press(screen.getByRole('button', { name: '크리스마스 눈사람 상품 상세' }));
    await waitFor(() => expect(router.getPathname()).toBe('/products/77'));
  });

  it('댓글이 없으면 그렇게 적는다', async () => {
    server.use(
      gqlOk('SellerReviewsDetail', DETAIL),
      gqlOk('SellerReviewsComments', {
        reviewComments: { items: [], totalCount: 0, hasMore: false, nextCursor: null },
      }),
    );
    await open('/store/reviews/9');
    expect(await screen.findByText('아직 댓글이 없어요')).toBeTruthy();
  });

  it('삭제된 리뷰는 안내만 보여 준다', async () => {
    server.use(
      gqlError('SellerReviewsDetail', {
        message: '리뷰를 찾을 수 없습니다.',
        code: 'REVIEW_NOT_FOUND',
        classification: 'NOT_FOUND',
        statusCode: 404,
      }),
    );
    await open('/store/reviews/9');
    expect(await screen.findByText('삭제되었거나 볼 수 없는 리뷰예요')).toBeTruthy();
  });

  it('그 밖의 오류는 다시 시도를 보여 준다', async () => {
    server.use(graphql.query('SellerReviewsDetail', () => HttpResponse.json({}, { status: 500 })));
    await open('/store/reviews/9');
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeTruthy();
  });
});
