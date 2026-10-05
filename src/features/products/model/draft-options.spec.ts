import {
  addGroup,
  addItem,
  changeGroup,
  changeItem,
  type OptionGroupValue,
  optionsError,
  rangeLabel,
  removeItem,
  reorderGroups,
  requiredPatch,
} from './draft-options';

const item = (key: string) => ({
  key,
  title: key,
  description: '',
  priceDelta: 0,
  imageUrl: null,
});
const group = (key: string, items = [item(`${key}-1`)]): OptionGroupValue => ({
  key,
  name: `그룹 ${key}`,
  description: '',
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  items,
});

describe('requiredPatch', () => {
  it('필수를 끄면 최소 0, 켜면 최소 1 이상', () => {
    const g = group('a');
    expect(requiredPatch(g, false)).toEqual({ isRequired: false, minSelect: 0, maxSelect: 1 });
    expect(requiredPatch({ ...g, isRequired: false, minSelect: 0 }, true)).toEqual({
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
    });
    expect(requiredPatch({ ...g, minSelect: 2, maxSelect: 3 }, true)).toMatchObject({
      minSelect: 2,
      maxSelect: 3,
    });
  });

  it('범위 문구', () => {
    expect(rangeLabel({ ...group('a'), minSelect: 0, maxSelect: 2 })).toBe('최소 0 · 최대 2');
  });
});

describe('optionsError', () => {
  it('옵션 없이도 진행할 수 있다', () => {
    expect(optionsError([])).toBeNull();
    expect(optionsError([group('a')])).toBeNull();
  });

  it('옵션이 없는 그룹은 막는다', () => {
    expect(optionsError([group('a'), group('b', [])])).toBe(
      "'그룹 b' 그룹에 옵션을 1개 이상 추가해 주세요",
    );
  });

  it('최소 선택 수가 옵션 수보다 크면 막는다', () => {
    expect(optionsError([{ ...group('a'), minSelect: 2, maxSelect: 2 }])).toBe(
      "'그룹 a' 그룹의 최소 선택 수가 옵션 수보다 많아요",
    );
  });
});

describe('편집 리듀서', () => {
  it('그룹·아이템을 추가·수정하고 새 key를 붙인다', () => {
    let groups = addGroup([], {
      name: '사이즈',
      description: '',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
    });
    const gk = groups[0]!.key;
    groups = addItem(groups, gk, {
      title: '1호',
      description: '',
      priceDelta: 5000,
      imageUrl: null,
    });
    groups = addItem(groups, gk, { title: '2호', description: '', priceDelta: 0, imageUrl: null });
    const [first, second] = groups[0]!.items;
    expect(first!.key).not.toBe(second!.key);
    groups = changeGroup(groups, gk, { name: '케이크 사이즈' });
    groups = changeItem(groups, gk, first!.key, { priceDelta: 3000 });
    expect(groups[0]).toMatchObject({
      name: '케이크 사이즈',
      items: [{ title: '1호', priceDelta: 3000 }, { title: '2호' }],
    });
  });

  it('다른 그룹은 건드리지 않는다', () => {
    const groups = [group('a'), group('b')];
    expect(changeItem(groups, 'a', 'a-1', { title: 'x' })[1]).toBe(groups[1]);
    expect(addItem(groups, 'a', item('n'))[1]).toBe(groups[1]);
    expect(removeItem(groups, 'a', 'a-1')[1]).toBe(groups[1]);
  });

  it('key 순서대로 다시 정렬한다', () => {
    const groups = [group('a'), group('b'), group('c')];
    expect(reorderGroups(groups, ['c', 'a', 'b']).map((g) => g.key)).toEqual(['c', 'a', 'b']);
  });

  it('옵션을 지우면 최대·최소 선택 수를 남은 옵션 수에 맞춘다', () => {
    const g = { ...group('a', [item('1'), item('2'), item('3')]), minSelect: 3, maxSelect: 3 };
    expect(removeItem([g], 'a', '3')[0]).toMatchObject({ minSelect: 2, maxSelect: 2 });
    expect(removeItem([group('a')], 'a', 'a-1')[0]).toMatchObject({
      items: [],
      minSelect: 1,
      maxSelect: 1,
    });
  });
});
