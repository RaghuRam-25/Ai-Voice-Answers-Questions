import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: 'hsl(222, 20%, 7%)',
          raised: 'hsl(222, 18%, 10%)',
          overlay: 'hsl(222, 16%, 13%)',
        },
        brand: {
          DEFAULT: 'hsl(237, 80%, 66%)',
          light: 'hsl(237, 90%, 76%)',
          muted: 'hsl(237, 40%, 30%)',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        glow: '0 0 40px -12px hsla(237, 80%, 66%, 0.4)',
        'glow-sm': '0 0 20px -8px hsla(237, 80%, 66%, 0.3)',
        card: '0 1px 3px 0 hsla(0, 0%, 0%, 0.4), 0 1px 2px -1px hsla(0, 0%, 0%, 0.4)',
        'card-hover': '0 8px 24px -8px hsla(0, 0%, 0%, 0.5), 0 2px 6px -2px hsla(0, 0%, 0%, 0.4)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse_ring: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-ring': 'pulse_ring 1.5s ease-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
