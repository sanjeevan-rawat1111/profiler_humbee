/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        humbee: {
          50: '#f0faf8',
          100: '#d7f3ec',
          200: '#b0e5d9',
          300: '#7dcfc0',
          400: '#4fb2a2',
          500: '#349688',
          600: '#27796f',
          700: '#20625a',
          800: '#1b4f49',
          900: '#18423e',
          950: '#0c2725',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
