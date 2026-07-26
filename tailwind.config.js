/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bog: '#0E1712',
        surface: '#17241D',
        'surface-2': '#1F3128',
        line: '#2F473A',
        bone: '#E9E5D8',
        'bone-dim': '#9DAA9F',
        blaze: '#F2A33C',
        lichen: '#7FA986',
        clay: '#B5734A',
        alarm: '#E36B5A',
      },
      fontFamily: {
        display: ["'Archivo Black'", 'sans-serif'],
        body: ["'Barlow'", 'system-ui', 'sans-serif'],
        cond: ["'Barlow Semi Condensed'", 'sans-serif'],
      },
      borderRadius: { DEFAULT: '3px' },
    },
  },
  plugins: [],
}
