/** @type {import('tailwindcss').Config} */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { bg: v('bg'), fg: v('fg'), muted: v('muted'), accent: v('accent'), onaccent: v('onaccent'), a2: v('a2'), a3: v('a3') },
      fontFamily: { sans: ['Inter', 'system-ui', 'Noto Sans Tamil', 'Noto Sans Devanagari', 'sans-serif'] },
    },
  },
  plugins: [],
};
