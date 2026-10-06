import { Text, View } from 'react-native';

import { colors, shadow } from '@/shared/config/tokens';
import { Icon, RemoteImage, Stars } from '@/shared/ui';

import { formatReviewDate, mediaThumbs, nicknameOf, type ReviewMediaLike } from '../model/reviews';

/** 작성자 줄(.rh): 이니셜 36 r12 · 닉네임 14/600 · 날짜 12 · 별점(있으면) */
export function AuthorRow({
  nickname,
  createdAt,
  rating,
}: {
  nickname?: string | null;
  createdAt: string;
  rating?: number;
}) {
  const name = nicknameOf(nickname);
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-gray2">
        <Text className="font-sans text-base font-semibold text-label">{[...name][0]}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-sans text-base font-semibold tracking-tight text-text">{name}</Text>
        <Text className="mt-px font-sans text-xs tracking-tight text-muted">
          {formatReviewDate(createdAt)}
        </Text>
      </View>
      {rating !== undefined ? <Stars value={rating} /> : null}
    </View>
  );
}

interface Props {
  review: {
    rating: number;
    content?: string | null;
    media: readonly ReviewMediaLike[];
    likeCount: number;
    authorNickname?: string | null;
    createdAt: string;
  };
  productName: string;
  /** 주문 옵션 요약('1호 15cm') */
  options?: string;
  /** 목록은 3줄까지, 상세는 전문 */
  clamp?: boolean;
}

/** 리뷰 카드(.review). 판매자는 읽기 전용이라 좋아요 수만 남긴다 */
export function ReviewCard({ review, productName, options, clamp = false }: Props) {
  const thumbs = mediaThumbs(review.media);
  return (
    <View style={shadow.native.card} className="rounded-xl bg-surface p-4">
      <AuthorRow
        nickname={review.authorNickname}
        createdAt={review.createdAt}
        rating={review.rating}
      />
      <Text className="mt-2.5 font-sans text-xs tracking-tight text-muted">
        <Text className="font-medium text-label">{productName}</Text>
        {options ? ` · ${options}` : ''}
      </Text>
      {thumbs.length > 0 ? (
        <View className="mt-2.5 flex-row gap-1.5">
          {thumbs.map((uri, i) => (
            <View
              key={i}
              className="h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-gray2"
            >
              {uri ? (
                <RemoteImage
                  accessibilityLabel={`리뷰 사진 ${i + 1}`}
                  uri={uri}
                  style={{ width: 64, height: 64 }}
                />
              ) : (
                <Icon name="products" size={20} color={colors.placeholder} />
              )}
            </View>
          ))}
        </View>
      ) : null}
      {review.content ? (
        <Text
          numberOfLines={clamp ? 3 : undefined}
          className="mt-2.5 font-sans text-base tracking-tight text-text2"
        >
          {review.content}
        </Text>
      ) : null}
      <Text className="mt-2.5 self-end font-sans text-sm font-medium tracking-tight text-muted">
        {`좋아요 ${review.likeCount}`}
      </Text>
    </View>
  );
}
