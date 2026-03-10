import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#0d1f3c',
          light: '#162d54',
          mid: '#1e3a6e',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c97a',
        },
      },
      animation: {
        'pulse-green': 'pulse-green 2s infinite',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 8px 24px rgba(37,211,102,0.4)' },
          '50%': { boxShadow: '0 8px 40px rgba(37,211,102,0.65)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
