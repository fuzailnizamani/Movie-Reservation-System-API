/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cinema: {
          ink: '#0a0a0f',
          panel: '#12121a',
          raised: '#1c1c28',
          elevated: '#232334',
          line: '#2a2a3c',
          strong: '#3d3d52',
          muted: '#6b6b85',
          secondary: '#a1a1b5',
          text: '#f5f5f7',
          red: '#e50914',
          gold: '#f5c518',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
        elevated: '0 12px 48px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
