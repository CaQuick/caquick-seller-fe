import { type CakeRender, type RenderCatalog, resolveCakeRender } from '@/features/custom';
import { type CustomImageKindType, type SellerOrderDetailQuery } from '@/graphql/generated/graphql';
import { enumView } from '@/shared/lib/enum-view';

type OrderItem = SellerOrderDetailQuery['sellerOrder']['items'][number];

/** 구매자가 올린 커스텀 이미지 이름 */
export const customImageLabel = enumView(
  {
    THREE_D_TOP: '윗면',
    THREE_D_FRONT: '앞',
    THREE_D_BACK: '뒤',
    THREE_D_LEFT: '왼쪽',
    THREE_D_RIGHT: '오른쪽',
    SLOT_COMPOSITE: '합성 이미지',
  } satisfies Record<CustomImageKindType, string>,
  '이미지',
);

export interface Gallery {
  uris: string[];
  labels: string[];
}

/** 커스텀 이미지(3D 5장 또는 슬롯형 합성). 서버가 종류 순서(윗면 → 앞·뒤·왼·오)로 준다 */
export const customGallery = ({ customImages }: Pick<OrderItem, 'customImages'>): Gallery => ({
  uris: customImages.map((image) => image.imageUrl),
  labels: customImages.map((image) => customImageLabel(image.kind)),
});

/** 대표 이미지(3D 윗면·슬롯형 합성). 없으면 null */
export const customPreview = (item: Pick<OrderItem, 'customPreviewImageUrl' | 'customImages'>) =>
  item.customPreviewImageUrl ?? item.customImages[0]?.imageUrl ?? null;

/** null은 구매자가 선택 자리를 비운 것이라 기본 문구로 채우지 않는다 */
export const slotTextValue = (t: OrderItem['customTexts'][number]) =>
  t.valueText === null ? '문구 없음' : t.valueText || t.defaultText;

const SCALE = 10000;
const percent = (value: number) => `${(value / SCALE) * 100}%` as const;

/** 자유 편집 영역(바탕 한 변 10000)을 바탕 이미지 위 백분율 위치로 */
export const areaStyle = ({
  posX,
  posY,
  width,
  height,
}: Pick<OrderItem['freeEdits'][number], 'posX' | 'posY' | 'width' | 'height'>) => ({
  left: percent(posX),
  top: percent(posY),
  width: percent(width),
  height: percent(height),
});

/** 3D 대신 구매자 캡처를 보여 주는 이유 */
export type CaptureReason =
  'noDesign' | 'unsupported' | 'invalid' | 'tooMany' | 'catalogError' | 'glError';

export const CAPTURE_NOTICE: Record<CaptureReason, string> = {
  noDesign: '저장된 3D 디자인이 없어 구매자 캡처로 보여 드려요',
  unsupported: '앱을 업데이트하면 이 디자인을 3D로 볼 수 있어요',
  invalid: '디자인 정보를 읽을 수 없어 구매자 캡처로 보여 드려요',
  tooMany: '꾸미기가 많아 구매자 캡처로 보여 드려요',
  catalogError: '3D 정보를 불러오지 못해 구매자 캡처로 보여 드려요',
  glError: '3D를 그리지 못해 구매자 캡처로 보여 드려요',
};

export type DesignView =
  | { kind: 'loading' }
  | { kind: 'render'; render: CakeRender }
  | { kind: 'capture'; reason: CaptureReason };

/** 3D로 그릴 수 있으면 그릴 값, 아니면 캡처로 대신하는 이유. 카탈로그를 받는 동안은 loading */
export function designView(
  design: OrderItem['threeDDesign'],
  catalog: { data?: RenderCatalog; isError: boolean },
  glFailed: boolean,
): DesignView {
  if (!design) return { kind: 'capture', reason: 'noDesign' };
  if (!catalog.data)
    return catalog.isError ? { kind: 'capture', reason: 'catalogError' } : { kind: 'loading' };
  const result = resolveCakeRender(design, catalog.data);
  if (!result.ok) return { kind: 'capture', reason: result.reason };
  return glFailed
    ? { kind: 'capture', reason: 'glError' }
    : { kind: 'render', render: result.render };
}
