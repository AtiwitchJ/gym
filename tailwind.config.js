/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#fdfbf7',
          dim: '#f7f1e4',
          subtle: '#faf4e8',
        },
        surface: {
          DEFAULT: '#ffffff',
          low: '#faf4e8',
          card: '#f4ece0',
          high: '#eee2d0',
          highest: '#e6d6be',
        },
        plate: {
          DEFAULT: '#1e2220',
          dark: '#141715',
        },
        ink: {
          DEFAULT: '#1e2220',
          muted: '#4a544f',
          faint: '#727c75',
        },
        flame: {
          DEFAULT: '#ea580c',
          glow: '#f97316',
          bg: '#fff7ed',
          border: '#ea580c',
        },
        gold: {
          DEFAULT: '#f59e0b',
          glow: '#fbbf24',
          bg: '#fefce8',
        },
        sky: {
          DEFAULT: '#0284c7',
          bg: '#f0f9ff',
        },
        // Text variants with >= 4.5:1 contrast on white (accessibility item 1)
        'emerald-text': '#047857',
        'flame-text': '#c2410c',
        'sky-text': '#0369a1',
        emerald: {
          DEFAULT: '#059669',
          bg: '#f0fdf4',
          border: '#10b981',
        }
      },
      boxShadow: {
        'plate': '3px 3px 0px #1e2220',
        'plate-sm': '2px 2px 0px #1e2220',
        'plate-lg': '4px 4px 0px #1e2220',
        'flame': '3px 3px 0px #ea580c',
        'flame-sm': '2px 2px 0px #ea580c',
        'emerald': '2px 2px 0px #059669',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'Prompt', 'sans-serif'],
        body: ['Noto Sans Thai', 'Prompt', 'Inter', 'sans-serif'],
        mono: ['Space Mono', 'JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
