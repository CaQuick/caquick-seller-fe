/**
 * 디자인 토큰 1벌 — 색 hex는 여기에만 둔다. tailwind.config.js가 theme으로 읽고,
 * NativeWind가 닿지 않는 곳(네이티브 헤더·탭바·sonner·피커)은 TS에서 직접 참조한다.
 * 값은 시안 PNG 픽셀 계측값이며 Figma 토큰 표가 오면 교체한다.
 */

export const colors = {
  primary: '#7077FE', // 버튼·선택 칩·활성 밑줄
  primaryStrong: '#6D5BFF', // CTA pill·FAB·활성 탭
  accent: '#4E1EFA', // 히어로 강조 숫자
  purpleText: '#7B5EF8',
  primarySoft: '#A3A8FF',
  caret: '#7C5CFF',
  tint: '#EDEBFF',
  tint2: '#F7F7FF',
  track: '#EDEBFF',
  track2: '#EBECF4',
  stepDone: '#D3CEFF',
  stepNow: '#AFB1FE',
  stepLast: '#897FFF',
  bg: '#FBFBFF',
  surface: '#FFFFFF',
  border: '#C6C6C6',
  chipBorder: '#E4E4E4',
  chipOff: '#D3CEFF',
  line: '#EBECF4',
  line2: '#F0F0F0',
  dash: '#D9D7E7',
  grab: '#D8D8D8',
  text: '#1D1D1D',
  text2: '#2E2E2E',
  text3: '#2D2A32',
  ink: '#000000',
  label: '#555555',
  sublabel: '#6A6A6B',
  muted: '#8E8E8E',
  placeholder: '#B8B4BB',
  placeholder2: '#CDCDCD',
  grayBg: '#F3F3F6',
  gray2: '#F4F4F8',
  tagLight: '#F0F0F0',
  mintBg: '#E9FEF2',
  mintText: '#4ED88A',
  tagDark: '#555555',
  chevron: '#CDCDCD',
  dim: 'rgba(0,0,0,0.52)',
  keyboard: '#D1D2D9',
  keyDark: '#AAB0BB',
  danger: '#E5484D',
  dangerBg: '#FFF1F1',
  star: '#FFC43D',
} as const;

export const radius = {
  xs: 4,
  sm: 8, // 입력·버튼·칩
  md: 10, // 세그먼트·검색바·메뉴 아이콘
  lg: 12, // 뒤로가기 박스·미리보기 버튼
  xl: 16, // 카드·옵션 그룹·드롭존
  '2xl': 20,
  sheet: 28, // 바텀시트 상단
  full: 999,
} as const;

export const spacing = {
  gutter: 20,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  section: 38, // 섹션 라벨 위
  sectionWide: 42, // 드롭존·썸네일 뒤
} as const;

/** 컴포넌트 치수(px) */
export const size = {
  touchTarget: 44,
  header: 52,
  backButton: 36,
  field: 48,
  fieldMulti: 98,
  button: 48,
  buttonSm: 40,
  buttonPill: 50,
  chip: 37,
  chipSm: 32,
  row: 56,
  search: 44,
  segment: 34,
  stepBar: 9,
  grab: { width: 34, height: 4 },
  tabBar: 70,
  fab: 68,
  kpiCard: 95,
} as const;

export const fontFamily = 'Pretendard';

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** 크기 단계와 행간(px). 시안 행 피치 계측값 */
export const fontSize = {
  xs: { size: 12, lineHeight: 16 },
  sm: { size: 13, lineHeight: 18 },
  base: { size: 14, lineHeight: 20 },
  md: { size: 15, lineHeight: 20 },
  lg: { size: 16, lineHeight: 22 },
  xl: { size: 17, lineHeight: 24 },
  '2xl': { size: 18, lineHeight: 24 },
  '3xl': { size: 20, lineHeight: 26 },
  '4xl': { size: 22, lineHeight: 28 },
  '5xl': { size: 24, lineHeight: 28 },
} as const;

/** 시안 글자가 기본값보다 미세하게 좁다 — Pretendard 본문 기본 -0.01em */
export const letterSpacing = {
  normal: '0em',
  tight: '-0.01em',
  tighter: '-0.02em',
} as const;

/** RN letterSpacing은 px — 글자 크기에 em 비율을 곱해 쓴다 */
export const tracking = (size: number, em = -0.01): number => Math.round(size * em * 100) / 100;

export const shadow = {
  /** tailwind boxShadow(문자열) */
  css: {
    card: '0 4px 12px rgba(0,0,0,0.05)',
    field: '0 2px 6px rgba(0,0,0,0.03)',
    fab: '0 8px 16px rgba(109,91,255,0.3)',
  },
  /** RN style 객체 */
  native: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    field: {
      shadowColor: '#000000',
      shadowOpacity: 0.03,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    fab: {
      shadowColor: '#6D5BFF',
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  },
} as const;
