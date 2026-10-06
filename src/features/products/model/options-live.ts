import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { type SellerProductManageQuery } from '@/graphql/generated/graphql';
import { messageFor } from '@/shared/api';
import { showToast } from '@/shared/ui';

import { createOptionGroup, createOptionItem } from '../api/create';
import {
  deleteOptionGroup,
  deleteOptionItem,
  reorderOptionGroups,
  reorderOptionItems,
  updateOptionGroup,
  updateOptionItem,
} from '../api/manage';
import { productsKeys } from '../api/queryKeys';
import {
  changeGroup,
  changeItem,
  type GroupFields,
  type ItemFields,
  type OptionGroupValue,
  reorderGroups,
} from './draft-options';

type ManageProduct = SellerProductManageQuery['sellerProduct'];
type Groups = OptionGroupValue[];

export const OPTIONS_COPY = {
  title: '옵션 편집',
  guide: '바꾸는 즉시 저장돼요. 저장 버튼이 따로 없어요',
  section: '옵션 그룹',
  hint: '꺼진 옵션은 구매자에게 보이지 않아요. 그룹을 길게 눌러 순서를 바꿉니다',
} as const;

/** 서버 id를 편집기 key로 쓴다 */
export function toOptionGroups(product: ManageProduct): Groups {
  return product.optionGroups.map((g) => ({
    key: g.id,
    name: g.name,
    description: g.description ?? '',
    isRequired: g.isRequired,
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    items: g.optionItems.map((i) => ({
      key: i.id,
      title: i.title,
      description: i.description ?? '',
      priceDelta: i.priceDelta,
      imageUrl: i.imageUrl,
      isActive: i.isActive,
    })),
  }));
}

/** 실제로 바뀐 필드만 — 시트가 값을 통째로 돌려줘도 요청은 차이만 보낸다 */
export function changedFields<T extends object>(current: T, patch: Partial<T>): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([k, v]) => current[k as keyof T] !== v),
  ) as Partial<T>;
}

const sameOrder = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((k, i) => b[i] === k);

/**
 * 옵션 편집기를 조작마다 바로 저장하는 어댑터. 화면은 먼저 바꾸고, 요청이 실패하면 캐시의 서버 값으로
 * 되돌린다. 요청은 조작 순서대로 하나씩 보내고, 줄이 빌 때까지 서버 값으로 덮지 않는다 — 끝난 뒤 다시
 * 받은 값이 진실이다
 */
export function useLiveOptions(product: ManageProduct) {
  const queryClient = useQueryClient();
  const [groups, setGroups] = useState(() => toOptionGroups(product));
  const [inFlight, setInFlight] = useState(0);
  const [synced, setSynced] = useState<ManageProduct | null>(product);
  if (synced !== product && inFlight === 0) {
    setSynced(product);
    setGroups(toOptionGroups(product));
  }

  // 동시에 보내면 늦게 반영된 앞 편집이 뒤 편집을 덮을 수 있다
  const queue = useRef(Promise.resolve());
  const run = (next: ((g: Groups) => Groups) | null, request: () => Promise<unknown>) => {
    if (next) setGroups(next);
    setInFlight((n) => n + 1);
    queue.current = queue.current.then(async () => {
      try {
        await request();
      } catch (e) {
        setSynced(null);
        showToast.error(messageFor(e));
      } finally {
        setInFlight((n) => n - 1);
        void queryClient.invalidateQueries({ queryKey: productsKeys.detail(product.id) });
      }
    });
  };
  const group = (key: string) => groups.find((g) => g.key === key);

  return {
    groups,
    onAddGroup: (fields: GroupFields) =>
      run(null, () =>
        createOptionGroup({
          productId: product.id,
          ...fields,
          description: fields.description || undefined,
          sortOrder: groups.length,
        }),
      ),
    onChangeGroup: (key: string, patch: Partial<GroupFields>) => {
      const current = group(key);
      const changed = current ? changedFields<GroupFields>(current, patch) : {};
      if (Object.keys(changed).length === 0) return;
      run(
        (g) => changeGroup(g, key, changed),
        () => updateOptionGroup({ optionGroupId: key, ...changed }),
      );
    },
    onRemoveGroup: (key: string) =>
      run(
        (g) => g.filter((x) => x.key !== key),
        () => deleteOptionGroup(key),
      ),
    onReorderGroups: (keys: string[]) => {
      if (
        sameOrder(
          keys,
          groups.map((g) => g.key),
        )
      )
        return;
      run(
        (g) => reorderGroups(g, keys),
        () => reorderOptionGroups(product.id, keys),
      );
    },
    onAddItem: (groupKey: string, fields: ItemFields) =>
      run(null, () =>
        createOptionItem({
          optionGroupId: groupKey,
          title: fields.title,
          description: fields.description || undefined,
          priceDelta: fields.priceDelta,
          imageUrl: fields.imageUrl ?? undefined,
          sortOrder: group(groupKey)?.items.length ?? 0,
        }),
      ),
    onChangeItem: (groupKey: string, itemKey: string, patch: Partial<ItemFields>) => {
      const current = group(groupKey)?.items.find((i) => i.key === itemKey);
      const changed = current ? changedFields<ItemFields>(current, patch) : {};
      if (Object.keys(changed).length === 0) return;
      run(
        (g) => changeItem(g, groupKey, itemKey, changed),
        () => updateOptionItem({ optionItemId: itemKey, ...changed }),
      );
    },
    onRemoveItem: (groupKey: string, itemKey: string) =>
      run(
        (g) =>
          g.map((x) =>
            x.key === groupKey ? { ...x, items: x.items.filter((i) => i.key !== itemKey) } : x,
          ),
        () => deleteOptionItem(itemKey),
      ),
    onReorderItems: (groupKey: string, keys: string[]) =>
      run(
        (g) =>
          g.map((x) =>
            x.key === groupKey
              ? { ...x, items: keys.flatMap((k) => x.items.filter((i) => i.key === k)) }
              : x,
          ),
        () => reorderOptionItems(groupKey, keys),
      ),
  };
}
