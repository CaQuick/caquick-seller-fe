import { changedFields, toOptionGroups } from './options-live';

describe('toOptionGroups', () => {
  it('서버 id를 key로, null 설명은 빈 문자열로 옮긴다', () => {
    expect(
      toOptionGroups({
        id: '7',
        customTemplate: null,
        optionGroups: [
          {
            id: 'g1',
            name: '사이즈',
            description: null,
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            optionItems: [
              {
                id: 'o1',
                title: '0호',
                description: null,
                imageUrl: null,
                priceDelta: 0,
                isActive: false,
              },
            ],
          },
        ],
      }),
    ).toEqual([
      {
        key: 'g1',
        name: '사이즈',
        description: '',
        isRequired: true,
        minSelect: 1,
        maxSelect: 1,
        items: [
          {
            key: 'o1',
            title: '0호',
            description: '',
            imageUrl: null,
            priceDelta: 0,
            isActive: false,
          },
        ],
      },
    ]);
  });
});

describe('changedFields', () => {
  it('값이 같은 필드는 뺀다', () => {
    expect(
      changedFields(
        { title: '0호', priceDelta: 0, isActive: true },
        { title: '0호', priceDelta: 500 },
      ),
    ).toEqual({ priceDelta: 500 });
    expect(changedFields({ title: '0호' }, { title: '0호' })).toEqual({});
  });
});
