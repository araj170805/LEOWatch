/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#050816',
        panel: '#0b1026',
        raised: '#101738',
        // Neutral slate hairline — replaces the cyan-tinted border so the UI
        // reads calmer and accent colour stays meaningful.
        line: 'rgba(148, 163, 184, 0.12)',
        'line-bright': 'rgba(56, 225, 255, 0.30)',
        primary: '#E8EDF6',
        dim: '#8B97AB',
        faint: '#5B6678',
        track: '#00F0FF',
        'track-dim': '#00B8CC',
        accent: '#A200FF',
        // Semantic palette
        info: '#5B9DFF',
        teal: '#2DD4BF',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        critical: '#EF4444',
        risk: {
          low: '#34D399',
          med: '#FBBF24',
          high: '#F87171',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        // Soft neutral elevation — no cyan ring.
        panel: '0 12px 32px -16px rgba(0, 0, 0, 0.7)',
        glow: '0 0 22px -8px rgba(0, 240, 255, 0.25)',
        'accent-glow': '0 0 22px -8px rgba(162, 0, 255, 0.32)',
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

