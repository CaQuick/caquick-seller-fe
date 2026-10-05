import { type ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/shared/config/tokens';

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${2 * r - w}a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}z`;

const EYE = `M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z${circle(12, 12, 3)}`;
const CHAT = 'M4 5h16v11H9l-5 4z';

/** 시안 라인 아이콘(24 그리드, 획 2). 뒤로가기는 시안대로 획 1.5 */
const ICONS = {
  back: { d: 'M18 12H6M11 7l-5 5 5 5', stroke: 1.5 },
  add: { d: 'M12 2v20M2 12h20' },
  plus: { d: 'M12 5v14M5 12h14' },
  close: { d: 'M6 6l12 12M18 6 6 18' },
  check: { d: 'm5 12 5 5 9-10' },
  chevronLeft: { d: 'm15 6-6 6 6 6' },
  chevronRight: { d: 'm9 6 6 6-6 6' },
  chevronDown: { d: 'm6 9 6 6 6-6' },
  search: { d: `${circle(11, 11, 7)}M20 20l-4-4` },
  more: { d: `${circle(5, 12, 1)}${circle(12, 12, 1)}${circle(19, 12, 1)}` },
  retry: { d: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5' },
  send: { d: 'M4 12 20 4l-4 16-4-7z' },
  phone: {
    d: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  },
  eye: { d: EYE },
  eyeOff: { d: `${EYE}M4 4l16 16` },
  alert: { d: `${circle(12, 12, 9)}M12 8v5M12 16h.01` },
  home: { d: 'M3 10.5 12 3l9 7.5V21H3zM10 21v-6h4v6' },
  orders: { d: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
  products: { d: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8' },
  chats: { d: CHAT },
  store: { d: 'M4 9l1-4h14l1 4M4 9v11h16V9M4 9h16M10 20v-6h4v6' },
  autoReply: { d: `${CHAT}M9 9h6M9 12h3` },
  clock: { d: `${circle(12, 12, 9)}M12 7v5l3 2` },
  closure: { d: `${rect(3, 5, 18, 16, 2)}M3 10h18M8 3v4M16 3v4M10 14l4 4M14 14l-4 4` },
  pickup: { d: 'M6 8h12l1 13H5zM9 8V6a3 3 0 0 1 6 0v2' },
  capacity: {
    d: [3, 14].flatMap((y) => [3, 14].map((x) => rect(x, y, 7, 7, 1))).join(''),
  },
  star: { d: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z' },
  history: { d: 'M4 7h16M4 12h16M4 17h10' },
  faq: { d: 'M8 7h8M8 12h8M8 17h8' },
  handle: { d: 'M4 6h16M4 12h16M4 18h16' },
  settings: {
    d: `${circle(12, 12, 3)}M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1`,
  },
  location: { d: `M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z${circle(12, 10, 2.5)}` },
} satisfies Record<string, { d: string; stroke?: number }>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  color?: ColorValue;
  /** 활성 탭처럼 면을 채울 때 */
  fill?: ColorValue;
  strokeWidth?: number;
  testID?: string;
}

/** 장식 아이콘. 누를 수 있는 곳은 감싼 Pressable이 접근성 라벨을 갖는다 */
export function Icon({ name, size = 20, color = colors.text2, fill, strokeWidth, testID }: Props) {
  const icon: { d: string; stroke?: number } = ICONS[name];
  return (
    <Svg
      testID={testID}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d={icon.d}
        fill={fill ?? 'none'}
        stroke={color}
        strokeWidth={strokeWidth ?? icon.stroke ?? 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
