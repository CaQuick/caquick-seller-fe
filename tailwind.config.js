// theme은 src/shared/config/tokens.ts 한 곳에서 온다(Node 24 type stripping으로 .ts를 그대로 require).
const {
  colors,
  radius,
  fontSize,
  letterSpacing,
  shadow,
} = require('./src/shared/config/tokens.ts');

/** primaryStrong → primary-strong */
const kebab = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), v]),
  );
const px = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, `${v}px`]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: kebab(colors),
      borderRadius: px(radius),
      fontFamily: { sans: ['Pretendard'] },
      fontSize: Object.fromEntries(
        Object.entries(fontSize).map(([k, { size, lineHeight }]) => [
          k,
          [`${size}px`, { lineHeight: `${lineHeight}px` }],
        ]),
      ),
      letterSpacing: kebab(letterSpacing),
      boxShadow: kebab(shadow.css),
    },
  },
  plugins: [],
};
