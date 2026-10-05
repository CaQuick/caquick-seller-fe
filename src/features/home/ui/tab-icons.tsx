import { type ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export type TabName = 'home' | 'orders' | 'products' | 'chats' | 'store';

const PATHS: Record<TabName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10M10 20v-6h4v6',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h4',
  products: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9zM3 7.5 12 12l9-4.5M12 12v9',
  chats: 'M4 5h16v11H9l-5 4V5z',
  store: 'M4 4h16l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0l1-5zM5 9v11h14V9M10 20v-6h4v6',
};

/** 탭바 라인 아이콘. 색은 Tabs가 활성/비활성으로 넘긴다 */
export function TabIcon({
  name,
  color,
  size = 24,
}: {
  name: TabName;
  color: ColorValue;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={PATHS[name]}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {name === 'chats' ? <Circle cx={12} cy={10.5} r={1} fill={color} /> : null}
    </Svg>
  );
}
