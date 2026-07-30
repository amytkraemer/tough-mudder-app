/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // new industrial palette (spec 3.1)
        pitch: '#0A0A0B',
        char: '#15161A',
        steel: '#23262C',
        bone: '#EDEAE3',
        ash: '#8E9199',
        blaze: '#FF6A13',
        caution: '#FFD400',
        mud: '#7A5636',
        kill: '#C63A26',
        // back-compat names remapped to the new palette
        bog: '#0A0A0B',
        surface: '#15161A',
        'surface-2': '#23262C',
        line: '#23262C',
        'bone-dim': '#8E9199',
        lichen: '#FF6A13',
        clay: '#7A5636',
        alarm: '#C63A26',
      },
      fontFamily: {
        display: ["'Big Shoulders Display'", "'Archivo Black'", 'sans-serif'],
        body: ["'Barlow'", 'system-ui', 'sans-serif'],
        cond: ["'Barlow Semi Condensed'", 'sans-serif'],
      },
      borderRadius: { DEFAULT: '3px' },
    },
  },
  plugins: [],
}
