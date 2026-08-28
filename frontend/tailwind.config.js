/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#050816',
        panel: '#0b1026',
        raised: '#101738',
        line: 'rgba(0, 240, 255, 0.15)',
        'line-bright': 'rgba(0, 240, 255, 0.35)',
        primary: '#FFFFFF',
        dim: '#94A3B8',
        faint: '#64748B',
        track: '#00F0FF',
        'track-dim': '#00B8CC',
        accent: '#A200FF',
        risk: {
          low: '#10B981',
          med: '#F59E0B',
          high: '#EF4444',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 4px 20px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 240, 255, 0.15)',
        glow: '0 0 25px -5px rgba(0, 240, 255, 0.3)',
        'accent-glow': '0 0 25px -5px rgba(162, 0, 255, 0.4)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      keyframes: {
        pulse_dot: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.3, transform: 'scale(0.85)' },
        },
      },
      animation: {
        pulse_dot: 'pulse_dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

