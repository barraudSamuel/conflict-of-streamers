import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Background colors (agar.io-inspired dark theme)
        game: {
          dark: '#0a0a0a',
          grid: '#1a1a1a',
          surface: '#141414',
          border: '#2a2a2a',
          'border-light': '#3a3a3a',
        },
        // 8 Neon player colors (matches PLAYER_COLORS in shared/schemas)
        player: {
          red: '#FF3B3B',
          cyan: '#00F5FF',
          yellow: '#FFE500',
          green: '#00FF7F',
          magenta: '#FF00FF',
          purple: '#9D4EDD',
          orange: '#FF6B35',
          teal: '#00FFA3',
        },
        // Semantic colors (reusing player colors)
        success: '#00FF7F',
        danger: '#FF3B3B',
        warning: '#FFE500',
        info: '#00F5FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Typography scale - 18px minimum for streaming readability (FR53)
      fontSize: {
        'sm': ['16px', { lineHeight: '1.5' }],
        'base': ['18px', { lineHeight: '1.5' }],
        'lg': ['20px', { lineHeight: '1.5' }],
        'xl': ['24px', { lineHeight: '1.4' }],
        '2xl': ['30px', { lineHeight: '1.3' }],
        '3xl': ['36px', { lineHeight: '1.2' }],
        '4xl': ['48px', { lineHeight: '1.1' }],
        '5xl': ['60px', { lineHeight: '1.1' }],
      },
      // 8px base spacing system
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      // Glow effects for neon aesthetic
      boxShadow: {
        'glow-sm': '0 0 10px rgba(0, 245, 255, 0.3)',
        'glow': '0 0 20px rgba(0, 245, 255, 0.5)',
        'glow-lg': '0 0 30px rgba(0, 245, 255, 0.7)',
        'glow-red': '0 0 20px rgba(255, 59, 59, 0.5)',
        'glow-green': '0 0 20px rgba(0, 255, 127, 0.5)',
        'glow-yellow': '0 0 20px rgba(255, 229, 0, 0.5)',
        'glow-magenta': '0 0 20px rgba(255, 0, 255, 0.5)',
        'glow-purple': '0 0 20px rgba(157, 78, 221, 0.5)',
        'glow-orange': '0 0 20px rgba(255, 107, 53, 0.5)',
        'glow-teal': '0 0 20px rgba(0, 255, 163, 0.5)',
      },
      // Border radius
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      // Transitions
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      // Animation keyframes
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 245, 255, 0.8)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      // Backdrop blur
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: []
} satisfies Config
