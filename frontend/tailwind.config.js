/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#baddff',
          300: '#7cc0ff',
          400: '#36a3ff',
          500: '#0a86ff',
          600: '#006be0',
          700: '#0054b5',
          800: '#004794',
          900: '#003d7a',
          950: '#00254d',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f3d0fe',
          300: '#e9a8fc',
          400: '#d870f8',
          500: '#c040ee',
          600: '#a521d1',
          700: '#8918aa',
          800: '#701489',
          900: '#5c126d',
          950: '#3e0049',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          750: '#243247',
          800: '#1e293b',
          850: '#151e2e',
          900: '#0f172a',
          950: '#020617',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
