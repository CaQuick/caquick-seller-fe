import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { HttpResponse, graphql } from 'msw';
import { type ReactNode } from 'react';
import { Text } from 'react-native';

import { colors } from '@/shared/config/tokens';
import { server } from '@/test/msw/server';
import { Providers } from '@/test/render';

import { AppTabs } from './app-tabs';

let served = 0;
function serve(unansweredConversationCount: number) {
  served = 0;
  server.use(
    graphql.query('SellerHomeDashboard', () => {
      served += 1;
      return HttpResponse.json({
        data: {
          sellerDashboard: {
            date: '2026-10-06',
            newOrderCount: 0,
            pickupDay: { salesAmount: 0 },
            createdDay: { orderCount: 0 },
            remainingCapacity: null,
            activeProductCount: 0,
            unansweredConversationCount,
          },
        },
      });
    }),
  );
}

const stub = (label: string) => () => <Text>{label}</Text>;

function open() {
  return renderRouter(
    {
      '(tabs)/_layout': AppTabs,
      '(tabs)/index': stub('홈 본문'),
      '(tabs)/orders': stub('주문 본문'),
      '(tabs)/products': stub('상품 본문'),
      '(tabs)/chats': stub('채팅 본문'),
      '(tabs)/store': stub('매장 본문'),
    },
    {
      initialUrl: '/',
      wrapper: ({ children }: { children: ReactNode }) => <Providers>{children}</Providers>,
    },
  );
}

describe('AppTabs', () => {
  it('탭 5개(D27)를 두고, 채팅 탭에 답변이 필요한 대화 수를 배지로 단다', async () => {
    serve(3);
    const router = open();
    await router;
    expect(await screen.findByLabelText('채팅, 답변 필요 3건')).toBeTruthy();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    for (const tab of ['홈', '주문', '상품', '매장'])
      expect(screen.getByLabelText(tab)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('채팅, 답변 필요 3건'));
    await waitFor(() => expect(router.getPathname()).toBe('/chats'));
    expect(screen.getByText('채팅 본문')).toBeTruthy();
  });

  it('답변이 필요한 대화가 없으면 배지를 그리지 않는다', async () => {
    serve(0);
    await open();
    expect(await screen.findByText('홈 본문')).toBeTruthy();
    await waitFor(() => expect(served).toBe(1));
    expect(await screen.findByLabelText('채팅')).toBeTruthy();
    expect(screen.queryAllByText('0')).toHaveLength(0);
  });

  // 탭바는 탭마다 활성·비활성 아이콘을 둘 다 그리고 투명도로 바꾼다 — [활성, 비활성] 순서
  const iconPaths = (tab: string) =>
    screen
      .getAllByTestId(`tab-icon-${tab}`, { includeHiddenElements: true })
      .map((icon) => icon.queryAll((n) => n.type === 'RNSVGPath'));
  const argb = (brush: unknown) => (brush as { payload: number }).payload >>> 0;
  const hex = (color: string) => Number.parseInt(`ff${color.slice(1)}`, 16);

  it('홈 탭의 활성 아이콘은 전용 채움 아이콘(집 + 점)이고 비활성은 라인 아이콘이다', async () => {
    serve(0);
    await open();
    expect(await screen.findByText('홈 본문')).toBeTruthy();
    const [on, off] = iconPaths('index');
    expect(on?.map((p) => argb(p.props.fill))).toEqual([
      hex(colors.homeTabFill),
      hex(colors.stepLast),
    ]);
    expect(on?.[0]?.props.stroke).toBeUndefined();
    expect(off).toHaveLength(1);
    expect(off?.[0]?.props.stroke).toBeDefined();
    // 반증: 전용 아이콘이 없는 탭은 활성이어도 라인 + 연보라 채움
    const [productsOn] = iconPaths('products');
    expect(productsOn).toHaveLength(1);
    expect(argb(productsOn?.[0]?.props.fill)).toBe(hex(colors.tint));
  });

  it('목록 탭은 뒤로가기 없는 가운데 제목(.hdr), 매장은 큰 제목, 홈은 헤더가 없다', async () => {
    serve(0);
    const router = open();
    await router;
    expect(await screen.findByText('홈 본문')).toBeTruthy();
    expect(screen.queryByTestId('tab-header')).toBeNull();

    for (const [label, path] of [
      ['상품', '/products'],
      ['주문', '/orders'],
      ['채팅', '/chats'],
      ['매장', '/store'],
    ] as const) {
      await fireEvent.press(screen.getByLabelText(label));
      await waitFor(() => expect(router.getPathname()).toBe(path));
      const header = within(screen.getByTestId('tab-header'));
      expect(header.getByRole('header', { name: label })).toBeTruthy();
      expect(header.queryByRole('button', { name: '뒤로 가기' })).toBeNull();
    }
  });
});
