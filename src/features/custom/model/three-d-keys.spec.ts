import { groupThreeD, keyOptions, type ThreeDChoice, threeDCategoryLabel } from './three-d-keys';

const choice = (key: string, category: ThreeDChoice['category'], selectable = true) => ({
  key,
  category,
  value: key.split('.')[1]!,
  label: key,
  defaultPriceDelta: 0,
  renderScale: null,
  selectable,
});
const CHOICES: ThreeDChoice[] = [
  choice('shape.heart', 'SHAPE'),
  choice('shape.circle', 'SHAPE'),
  choice('shape.old', 'SHAPE', false),
  choice('size.mini', 'SIZE'),
  choice('flavor.choco', 'FLAVOR'),
];
const item = (key: string, threeDKey: string | null, isActive = true) => ({
  key,
  threeDKey,
  isActive,
});
const view = (result: ReturnType<typeof keyOptions>) => ({
  category: result.category,
  keys: result.options.map(
    (o) => `${o.choice.key}${o.selected ? ' 선택' : ''}${o.disabled ? ' 사용 중' : ''}`,
  ),
});

describe('keyOptions', () => {
  it.each<[string, ReturnType<typeof item>[], string | null, ReturnType<typeof view>]>([
    [
      '연결된 항목이 없으면 모든 카테고리의 고를 수 있는 키',
      [item('o1', null)],
      null,
      { category: null, keys: ['shape.heart', 'shape.circle', 'size.mini', 'flavor.choco'] },
    ],
    [
      '다른 항목의 카테고리로 고정하고 그 키는 비활성',
      [item('o1', 'shape.heart'), item('o2', null)],
      'o2',
      { category: 'SHAPE', keys: ['shape.heart 사용 중', 'shape.circle'] },
    ],
    [
      '새 항목도 그룹 카테고리를 따른다',
      [item('o1', 'size.mini')],
      null,
      { category: 'SIZE', keys: ['size.mini 사용 중'] },
    ],
    [
      '혼자 연결된 항목은 다른 카테고리로 바꿀 수 있다',
      [item('o1', 'shape.heart'), item('o2', null)],
      'o1',
      {
        category: null,
        keys: ['shape.heart 선택', 'shape.circle', 'size.mini', 'flavor.choco'],
      },
    ],
    [
      '퇴역한 키는 지금 연결된 항목에만 보인다',
      [item('o1', 'shape.old'), item('o2', 'shape.heart')],
      'o1',
      { category: 'SHAPE', keys: ['shape.heart 사용 중', 'shape.circle', 'shape.old 선택'] },
    ],
    [
      '카탈로그에 없는 키는 카테고리를 정하지 않는다',
      [item('o1', 'gone.key'), item('o2', null)],
      'o2',
      { category: null, keys: ['shape.heart', 'shape.circle', 'size.mini', 'flavor.choco'] },
    ],
    [
      '꺼진 항목의 키는 카테고리를 정하지 않지만 다시 켤 때 겹치지 않게 비활성이다',
      [item('o1', 'flavor.choco', false), item('o2', null)],
      'o2',
      {
        category: null,
        keys: ['shape.heart', 'shape.circle', 'size.mini', 'flavor.choco 사용 중'],
      },
    ],
    [
      '켜진 항목이 있으면 꺼진 항목과 다른 카테고리로 고정한다',
      [item('o1', 'flavor.choco', false), item('o2', 'size.mini'), item('o3', null)],
      'o3',
      { category: 'SIZE', keys: ['size.mini 사용 중'] },
    ],
  ])('%s', (_, items, itemKey, expected) => {
    expect(view(keyOptions(CHOICES, items, itemKey))).toEqual(expected);
  });
});

describe('groupThreeD', () => {
  it.each<[string, ReturnType<typeof item>[], ReturnType<typeof groupThreeD>]>([
    [
      '키가 없는 그룹은 3D와 무관하다',
      [item('o1', null)],
      { category: null, mixed: false, unlinked: 0 },
    ],
    [
      '한 카테고리로 모이면 그 값',
      [item('o1', 'shape.heart'), item('o2', 'shape.old')],
      { category: 'SHAPE', mixed: false, unlinked: 0 },
    ],
    [
      '키 없는 활성 항목을 센다',
      [item('o1', 'shape.heart'), item('o2', null), item('o3', null, false)],
      { category: 'SHAPE', mixed: false, unlinked: 1 },
    ],
    [
      '카테고리가 섞이면 mixed',
      [item('o1', 'shape.heart'), item('o2', 'size.mini')],
      { category: null, mixed: true, unlinked: 0 },
    ],
    [
      '카탈로그에 없는 키는 연결로 세지만 카테고리는 없다',
      [item('o1', 'gone.key'), item('o2', null)],
      { category: null, mixed: false, unlinked: 1 },
    ],
    [
      '꺼진 항목의 키는 보지 않는다',
      [item('o1', 'shape.heart'), item('o2', 'size.mini', false)],
      { category: 'SHAPE', mixed: false, unlinked: 0 },
    ],
  ])('%s', (_, items, expected) => {
    expect(groupThreeD(CHOICES, items)).toEqual(expected);
  });
});

it('카테고리 라벨은 모르는 값이면 기타다', () => {
  expect(['SIZE', 'FLAVOR', 'SHAPE', 'DESIGN', 'CANDLE'].map(threeDCategoryLabel)).toEqual([
    '크기',
    '맛',
    '모양',
    '디자인',
    '기타',
  ]);
});
