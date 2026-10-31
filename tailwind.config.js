/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        titanium: {
          950: '#0E1015',
          900: '#12141B',
          800: '#181B24',
          700: '#232736',
          400: '#94A3B8',
          200: '#E2E8F0',
        },
        surface: {
          DEFAULT: '#161922',
          card: '#1A1D28',
          border: '#232736',
          muted: '#2A2F42'
        },
        crimson: {
          DEFAULT: '#E11D48',
          hover: '#BE123C',
          dark: '#4C0519',
          glow: 'rgba(225, 29, 72, 0.25)'
        },
        confirmed: {
          DEFAULT: '#059669',
          border: '#10B981',
          bg: 'rgba(5, 150, 105, 0.15)'
        }
      },
      fontFamily: {
        sans: ['Kanit', 'Outfit', 'sans-serif'],
        display: ['Outfit', 'Kanit', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace']
      }
    },
  },
  plugins: [],
}
