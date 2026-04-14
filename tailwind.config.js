/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'purple-deep':  '#2A1B5E',
        'purple-main':  '#4A2E8A',
        'purple-mid':   '#6B4FBB',
        'purple-light': '#8B6FDB',
        'bb-orange':    '#D4832A',
        'bb-orange-l':  '#F0A040',
        'bb-orange-d':  '#A85F18',
        'bb-brown':     '#2D1F14',
        'bb-tan':       '#C4956A',
        'bb-cream':     '#F5EFE0',
        'bb-gold':      '#F0B429',
      },
      fontFamily: {
        arcade: ['"Press Start 2P"', 'monospace'],
      },
    },
  },
  plugins: [],
}
