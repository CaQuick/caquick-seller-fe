import {
  formatReviewDate,
  mediaThumbs,
  nicknameOf,
  ratingDistribution,
  reviewListInput,
  sortLabel,
} from './reviews';

describe('ratingDistribution', () => {
  it('5점부터 개수와 비율', () => {
    expect(
      ratingDistribution([{ rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 1 }]),
    ).toEqual([
      { star: 5, count: 2, ratio: 0.5 },
      { star: 4, count: 1, ratio: 0.25 },
      { star: 3, count: 0, ratio: 0 },
      { star: 2, count: 0, ratio: 0 },
      { star: 1, count: 1, ratio: 0.25 },
    ]);
  });

  it.each([
    [4.5, 5],
    [4.4, 4],
    [0, 1],
    [0.4, 1],
    [7, 5],
  ])('반증: 평점 %d은 %d점 칸', (rating, star) => {
    const row = ratingDistribution([{ rating }]).find((r) => r.count === 1);
    expect(row?.star).toBe(star);
  });

  it('비어 있으면 비율 0', () => {
    expect(ratingDistribution([]).every((r) => r.count === 0 && r.ratio === 0)).toBe(true);
  });
});

it.each([
  [{ photoOnly: false, sort: 'LATEST' as const }, null],
  [{ photoOnly: true, sort: 'LIKES' as const }, 'c1'],
])('reviewListInput(%j, %s)', (filter, cursor) => {
  expect(reviewListInput('3', filter, cursor)).toEqual({
    storeId: '3',
    ...filter,
    cursor,
    limit: 20,
  });
});

it('sortLabel', () => {
  expect(sortLabel('LATEST')).toBe('최신순');
  expect(sortLabel('LIKES')).toBe('좋아요순');
});

it('formatReviewDate는 KST 날짜', () => {
  expect(formatReviewDate('2026-10-02T15:30:00.000Z')).toBe('2026.10.03');
});

it.each([
  ['김다은', '김다은'],
  [null, '탈퇴한 사용자'],
  ['  ', '탈퇴한 사용자'],
])('nicknameOf(%j) → %s', (name, expected) => {
  expect(nicknameOf(name)).toBe(expected);
});

it('mediaThumbs는 순서대로, 대표 프레임 없는 동영상은 null', () => {
  expect(
    mediaThumbs([
      { mediaType: 'VIDEO', mediaUrl: 'v.mp4', thumbnailUrl: null, sortOrder: 2 },
      { mediaType: 'IMAGE', mediaUrl: 'a.jpg', thumbnailUrl: null, sortOrder: 0 },
      { mediaType: 'VIDEO', mediaUrl: 'w.mp4', thumbnailUrl: 'w.jpg', sortOrder: 1 },
    ]),
  ).toEqual(['a.jpg', 'w.jpg', null]);
});
