import {
  type MixedStyleDeclaration,
  RenderHTMLConfigProvider,
  RenderHTMLSource,
  type RenderersProps,
  TRenderEngineProvider,
} from '@native-html/render';
import { type ReactNode, useMemo } from 'react';
import { Linking, useWindowDimensions } from 'react-native';

import { colors, fontFamily, fontSize, tracking } from '@/shared/config/tokens';

import { safeHref, sanitizeHtml } from '../model/sanitize-html';

const BASE: MixedStyleDeclaration = {
  fontFamily,
  fontSize: fontSize.md.size,
  lineHeight: 21,
  letterSpacing: tracking(fontSize.md.size),
  color: colors.text3,
};
const TAGS: Record<string, MixedStyleDeclaration> = {
  p: { marginTop: 0, marginBottom: 4 },
  a: { color: colors.primaryStrong },
};
const SYSTEM_FONTS = [fontFamily];
const RENDERERS_PROPS: Partial<RenderersProps> = {
  a: { onPress: (_, href) => void openSafe(href) },
};

async function openSafe(href: string) {
  const url = safeHref(href);
  if (url) await Linking.openURL(url).catch(() => undefined);
}

/** 방 하나에 엔진·설정 1벌(버블마다 만들면 렌더가 무겁다) */
export function HtmlProvider({ children }: { children: ReactNode }) {
  return (
    <TRenderEngineProvider
      baseStyle={BASE}
      tagsStyles={TAGS}
      systemFonts={SYSTEM_FONTS}
      enableCSSInlineProcessing={false}
    >
      <RenderHTMLConfigProvider renderersProps={RENDERERS_PROPS}>
        {children}
      </RenderHTMLConfigProvider>
    </TRenderEngineProvider>
  );
}

/** 서식 본문(FAQ 자동응답). 허용 태그만 남긴 DOM을 그린다 */
export function HtmlBody({ html }: { html: string }) {
  const { width } = useWindowDimensions();
  const source = useMemo(() => ({ dom: sanitizeHtml(html) }), [html]);
  return <RenderHTMLSource source={source} contentWidth={width * 0.7} />;
}
