// The colors the app uses read from CSS variables (src/theme.css), so dark mode can flip
// them in one place instead of adding dark: classes everywhere
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const themed = (name) =>
  Object.fromEntries(SHADES.map((shade) => [shade, `rgb(var(--c-${name}-${shade}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Page background and card surface (light: #f2f4f7 and white)
        page: 'rgb(var(--c-page) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        slate: themed('slate'),
        orange: themed('orange'),
        amber: themed('amber'),
        emerald: themed('emerald'),
        rose: themed('rose'),
        sky: themed('sky'),
        blue: themed('blue'),
        purple: themed('purple'),
        teal: themed('teal'),
      },
      fontFamily: {
        // Headings (h1/h2 automatically, or the font-display class)
        display: ['"Bricolage Grotesque"', '"Rethink Sans"', 'system-ui', 'sans-serif'],
        sans: [
          '"Rethink Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}