import {
  type SellerCustomCatalogQuery,
  type ThreeDOptionCategoryType,
} from '@/graphql/generated/graphql';
import { enumView } from '@/shared/lib/enum-view';

export type ThreeDChoice = SellerCustomCatalogQuery['customThreeDCatalog']['optionChoices'][number];

/** 옵션 항목 중 3D 연결에 필요한 값만 본다 */
interface KeyedItem {
  key: string;
  threeDKey?: string | null;
  isActive?: boolean;
}

export const threeDCategoryLabel = enumView(
  {
    SIZE: '크기',
    FLAVOR: '맛',
    SHAPE: '모양',
    DESIGN: '디자인',
  } satisfies Record<ThreeDOptionCategoryType, string>,
  '기타',
);

export interface KeyOption {
  choice: ThreeDChoice;
  selected: boolean;
  /** 같은 그룹의 다른 항목이 이미 쓴다 */
  disabled: boolean;
}

/**
 * itemKey 항목(새 항목이면 null)이 고를 수 있는 3D 키. 같은 그룹 다른 항목의 키가 카테고리를 정하고,
 * 그 항목들이 쓰는 키는 비활성이다. 퇴역한 키는 지금 연결된 것만 남긴다
 */
export function keyOptions(
  choices: readonly ThreeDChoice[],
  items: readonly KeyedItem[],
  itemKey: string | null,
): { category: ThreeDOptionCategoryType | null; options: KeyOption[] } {
  const byKey = new Map(choices.map((c) => [c.key, c]));
  const others = items.filter((i) => i.key !== itemKey);
  const category =
    others.flatMap((i) => (i.threeDKey ? (byKey.get(i.threeDKey) ?? []) : []))[0]?.category ?? null;
  const current = items.find((i) => i.key === itemKey)?.threeDKey ?? null;
  const used = new Set(others.flatMap((i) => i.threeDKey ?? []));
  const options = choices
    .filter((c) => (c.selectable || c.key === current) && (!category || c.category === category))
    .map((choice) => ({
      choice,
      selected: choice.key === current,
      disabled: used.has(choice.key),
    }));
  return { category, options };
}

/** 그룹 칩·경고: 활성 항목의 3D 카테고리와, 3D 그룹인데 키가 없는 활성 항목 수. 키가 하나도 없으면 3D와 무관한 그룹이다 */
export function groupThreeD(choices: readonly ThreeDChoice[], items: readonly KeyedItem[]) {
  const byKey = new Map(choices.map((c) => [c.key, c]));
  const active = items.filter((i) => i.isActive !== false);
  const linked = active.filter((i) => i.threeDKey);
  const categories = new Set(linked.flatMap((i) => byKey.get(i.threeDKey!)?.category ?? []));
  return {
    category: categories.size === 1 ? [...categories][0]! : null,
    mixed: categories.size > 1,
    unlinked: linked.length > 0 ? active.length - linked.length : 0,
  };
}
