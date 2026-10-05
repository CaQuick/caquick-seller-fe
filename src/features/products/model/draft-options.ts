/** 옵션 편집기 값. 등록 초안은 로컬 key, 상품 관리는 서버 id를 key로 쓴다 */
export interface ItemFields {
  title: string;
  description: string;
  priceDelta: number;
  imageUrl: string | null;
}

export interface GroupFields {
  name: string;
  description: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
}

export interface OptionItemValue extends ItemFields {
  key: string;
}

export interface OptionGroupValue extends GroupFields {
  key: string;
  items: OptionItemValue[];
}

/** 필수면 최소 1, 선택이면 0개 선택도 허용(BE isRequired=false) */
export function requiredPatch(group: GroupFields, isRequired: boolean): Partial<GroupFields> {
  const minSelect = isRequired ? Math.max(1, group.minSelect) : 0;
  return { isRequired, minSelect, maxSelect: Math.max(group.maxSelect, minSelect, 1) };
}

export const rangeLabel = ({ minSelect, maxSelect }: GroupFields) =>
  `최소 ${minSelect} · 최대 ${maxSelect}`;

/** 등록 전 막아야 하는 것: 빈 그룹과 옵션 수보다 큰 최소 선택 수(구매자가 주문할 수 없다) */
export function optionsError(groups: readonly OptionGroupValue[]): string | null {
  for (const g of groups) {
    if (g.items.length === 0) return `'${g.name}' 그룹에 옵션을 1개 이상 추가해 주세요`;
    if (g.minSelect > g.items.length) return `'${g.name}' 그룹의 최소 선택 수가 옵션 수보다 많아요`;
  }
  return null;
}

let seq = 0;
export const newKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

export function addGroup(groups: OptionGroupValue[], fields: GroupFields): OptionGroupValue[] {
  return [...groups, { ...fields, key: newKey('g'), items: [] }];
}

export function changeGroup(
  groups: OptionGroupValue[],
  key: string,
  patch: Partial<GroupFields>,
): OptionGroupValue[] {
  return groups.map((g) => (g.key === key ? { ...g, ...patch } : g));
}

export function reorderGroups(groups: OptionGroupValue[], keys: string[]): OptionGroupValue[] {
  return keys.flatMap((k) => groups.filter((g) => g.key === k));
}

export function addItem(
  groups: OptionGroupValue[],
  groupKey: string,
  fields: ItemFields,
): OptionGroupValue[] {
  return groups.map((g) =>
    g.key === groupKey ? { ...g, items: [...g.items, { ...fields, key: newKey('i') }] } : g,
  );
}

export function changeItem(
  groups: OptionGroupValue[],
  groupKey: string,
  itemKey: string,
  patch: Partial<ItemFields>,
): OptionGroupValue[] {
  return groups.map((g) =>
    g.key === groupKey
      ? { ...g, items: g.items.map((i) => (i.key === itemKey ? { ...i, ...patch } : i)) }
      : g,
  );
}

/** 옵션이 줄면 최대 선택 수도 따라 줄인다 — 남은 옵션보다 많이 고르게 둘 수 없다 */
export function removeItem(
  groups: OptionGroupValue[],
  groupKey: string,
  itemKey: string,
): OptionGroupValue[] {
  return groups.map((g) => {
    if (g.key !== groupKey) return g;
    const items = g.items.filter((i) => i.key !== itemKey);
    const maxSelect = Math.max(1, Math.min(g.maxSelect, items.length));
    return { ...g, items, maxSelect, minSelect: Math.min(g.minSelect, maxSelect) };
  });
}
