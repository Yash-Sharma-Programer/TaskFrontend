/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        plum: { 950: '#261232', 900: '#2E163B', 800: '#40204F' },
        coral: '#FF745F', canvas: '#F6F1FA', card: '#FFFCFA', ink: '#2A1832',
        muted: '#75667D', line: '#E5DCEB', success: '#3FB27F', warning: '#F5A742', danger: '#E95858'
      },
      boxShadow: { soft: '0 10px 30px rgba(42, 24, 50, .08)' },
      keyframes: { fadeIn: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } } },
      animation: { fade: 'fadeIn .18s ease-out' }
    }
  },
  plugins: []
};
