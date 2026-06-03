/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#000000', // Deep Black
        card: '#1C1C1E', // Dark Gray Card
        primary: '#FFFFFF', // White Text
        secondary: '#8E8E93', // Gray Subtext
        accent: '#FF3B30', // Red Accent
      },
      borderRadius: {
        card: '1rem', // 16px
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        condensed: ['"Roboto Condensed"', 'system-ui', 'sans-serif'],
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      gridTemplateColumns: {
        '14': 'repeat(14, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};
