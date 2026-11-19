import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { Providers } from '@/test/render';

import { OrderItemCard } from './order-item-card';

type Item = SellerOrderDetailQuery['sellerOrder']['items'][number];

const base: Item = {
  id: 'i1',
  productName: '레터링 케이크',
  quantity: 1,
  optionItems: [],
  customMode: 'NONE',
  customPreviewImageUrl: null,
  customBaseImageUrl: null,
  customImages: [],
  threeDDesign: null,
  customTexts: [],
  freeEdits: [],
};

const THREE_D: Item = {
  ...base,
  customMode: 'THREE_D',
  customPreviewImageUrl: 'https://img/top.png',
  customImages: [
    { id: 'c1', kind: 'THREE_D_TOP', imageUrl: 'https://img/top.png' },
    { id: 'c2', kind: 'THREE_D_FRONT', imageUrl: 'https://img/front.png' },
  ],
};

const SLOT: Item = {
  ...base,
  customMode: 'SLOT',
  customPreviewImageUrl: 'https://img/composite.png',
  customBaseImageUrl: 'https://img/base.png',
  customImages: [{ id: 'c1', kind: 'SLOT_COMPOSITE', imageUrl: 'https://img/composite.png' }],
  customTexts: [
    { id: 't2', label: '편지', defaultText: '사랑해', valueText: null, sortOrder: 2 },
    { id: 't1', label: '이름', defaultText: '다은', valueText: '지민', sortOrder: 1 },
  ],
  freeEdits: [
    {
      id: 'f1',
      posX: 1000,
      posY: 500,
      width: 2000,
      height: 2500,
      descriptionText: '하트를 크게',
      sortOrder: 1,
      attachments: [
        { id: 'a2', imageUrl: 'https://img/ref-2.jpg', sortOrder: 2 },
        { id: 'a1', imageUrl: 'https://img/ref-1.jpg', sortOrder: 1 },
      ],
    },
    {
      id: 'f2',
      posX: 6000,
      posY: 6000,
      width: 3000,
      height: 3000,
      descriptionText: '',
      sortOrder: 2,
      attachments: [],
    },
  ],
};

function open(item: Item) {
  return renderRouter(
    {
      'orders/[id]/index': () => <OrderItemCard orderId="7" item={item} />,
      'orders/[id]/design': () => <Text>디자인 화면</Text>,
    },
    { initialUrl: '/orders/7', wrapper: ({ children }) => <Providers>{children}</Providers> },
  );
}

describe('OrderItemCard 커스텀 표시', () => {
  it('3D 품목은 윗면 썸네일과 3D로 돌려 보기를 두고, 링크는 이 품목의 디자인 화면으로 간다', async () => {
    const router = open(THREE_D);
    await router;
    expect(screen.getByText('3D 디자인')).toBeTruthy();
    expect(screen.queryByText('커스텀 이미지')).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: '3D로 돌려 보기 ›' }));
    expect(await screen.findByText('디자인 화면')).toBeTruthy();
    expect(router.getPathname()).toBe('/orders/7/design');
    expect(router.getSearchParams()).toEqual({ id: '7', itemId: 'i1' });
  });

  it('3D 썸네일을 누르면 캡처를 윗면부터 전체 화면으로 넘겨 본다', async () => {
    await open(THREE_D);
    await fireEvent.press(screen.getByRole('imagebutton', { name: '3D 윗면 크게 보기' }));
    expect(await screen.findByText('윗면 · 1/2')).toBeTruthy();
    expect(screen.getByLabelText('앞')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByText('윗면 · 1/2')).toBeNull();
  });

  it('캡처가 없는 3D 품목은 썸네일 없이 링크만 둔다', async () => {
    await open({ ...THREE_D, customPreviewImageUrl: null, customImages: [] });
    expect(screen.queryByRole('imagebutton')).toBeNull();
    expect(screen.getByRole('link', { name: '3D로 돌려 보기 ›' })).toBeTruthy();
  });

  it('슬롯형은 합성 이미지와 문구 자리 이름·문구(비운 자리는 문구 없음)를 순서대로 보여 준다', async () => {
    await open(SLOT);
    expect(screen.getByRole('imagebutton', { name: '커스텀 이미지 크게 보기' })).toBeTruthy();
    expect(screen.queryByText('3D로 돌려 보기 ›')).toBeNull();
    const labels = screen
      .getAllByText(/^(이름|편지)$/)
      .map((node) => node.props.children as string);
    expect(labels).toEqual(['이름', '편지']);
    expect(screen.getByText('지민')).toBeTruthy();
    expect(screen.getByText('문구 없음')).toBeTruthy();
  });

  it('자유 편집은 바탕 위 번호 영역과 번호별 요청 사항·참고 사진을 둔다', async () => {
    await open(SLOT);
    expect(screen.getByLabelText('자유 편집 영역 1')).toHaveStyle({
      left: '10%',
      top: '5%',
      width: '20%',
      height: '25%',
    });
    expect(within(screen.getByLabelText('자유 편집 영역 2')).getByText('2')).toBeTruthy();
    expect(screen.getByText('요청 사항 1')).toBeTruthy();
    expect(screen.getByText('하트를 크게')).toBeTruthy();
    // 빈 요청은 제목도 두지 않는다
    expect(screen.queryByText('요청 사항 2')).toBeNull();

    await fireEvent.press(screen.getByRole('imagebutton', { name: '참고 사진 1-2 크게 보기' }));
    expect(await screen.findByText('참고 사진 1-2 · 2/2')).toBeTruthy();
  });

  it('바탕 이미지가 없으면 영역 그림 없이 요청 사항만 둔다', async () => {
    await open({
      ...SLOT,
      customBaseImageUrl: null,
      customPreviewImageUrl: null,
      customImages: [],
    });
    expect(screen.queryByText('자유 편집 영역')).toBeNull();
    expect(screen.queryByText('커스텀 이미지')).toBeNull();
    expect(screen.getByText('하트를 크게')).toBeTruthy();
  });

  it('캡처 목록에 없는 대표 이미지는 그 한 장만 연다', async () => {
    await open({ ...SLOT, customImages: [] });
    await fireEvent.press(screen.getByRole('imagebutton', { name: '커스텀 이미지 크게 보기' }));
    expect(await screen.findByText('커스텀 이미지 · 1/1')).toBeTruthy();
  });
});
