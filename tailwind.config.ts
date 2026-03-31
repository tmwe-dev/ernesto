import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ernesto: {
          primary: {
            50: '#f0f7ff',
            100: '#e0effe',
            200: '#c7e3fd',
            300: '#a3d0fc',
            400: '#7ab8f9',
            500: '#4f9eff',
            600: '#3578e5',
            700: '#2757c2',
            800: '#1f3f99',
            900: '#1a2d6e',
          },
          accent: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
            700: '#c2410c',
            800: '#92300a',
            900: '#78220a',
          },
          surface: {
            0: '#ffffff',
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
            950: '#030712',
          },
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
