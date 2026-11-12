import resolveConfig from 'tailwindcss/resolveConfig';

import config from '../../tailwind.config.js';

// tailwind가 클래스를 실제로 만드는지는 prettier-plugin-tailwindcss와 같은 내부 API(getClassOrder)로 묻는다
interface TailwindContext {
  getClassOrder: (classes: string[]) => [string, bigint | null][];
}
const { createContext } = jest.requireActual<{
  createContext: (resolved: unknown) => TailwindContext;
}>('tailwindcss/lib/lib/setupContextUtils');

// 앱 번들(metro)처럼 native 프리셋으로 푼다 — 기본 web 프리셋은 ios:·android: 변형을 모른다
const os = process.env.NATIVEWIND_OS;
process.env.NATIVEWIND_OS = 'ios';
const resolved = resolveConfig(config);
const context = createContext(resolved);
if (os === undefined) delete process.env.NATIVEWIND_OS;
else process.env.NATIVEWIND_OS = os;

/** tailwind(앱 theme)가 만드는 클래스인지. 모르는 클래스는 NativeWind가 경고 없이 버린다 */
export function isTailwindClass(cls: string): boolean {
  return context.getClassOrder([cls])[0]?.[1] != null;
}

const palette: Record<string, string | Record<string, string>> = { ...resolved.theme.colors };

/** theme 색 이름 → 값(중첩 팔레트는 gray-100, DEFAULT는 이름만) */
const colorByName = new Map(
  Object.entries(palette).flatMap(([name, value]) =>
    typeof value === 'string'
      ? [[name, value] as const]
      : Object.entries(value).map(
          ([shade, v]) => [shade === 'DEFAULT' ? name : `${name}-${shade}`, v] as const,
        ),
  ),
);

/** className에서 `${prefix}-색이름` 클래스가 가리키는 theme 색. 없거나 모르는 이름이면 undefined */
export function themeColor(className: unknown, prefix: 'bg' | 'text'): string | undefined {
  if (typeof className !== 'string') return undefined;
  for (const cls of className.split(/\s+/)) {
    if (!cls.startsWith(`${prefix}-`)) continue;
    const color = colorByName.get(cls.slice(prefix.length + 1));
    if (color) return color;
  }
  return undefined;
}
