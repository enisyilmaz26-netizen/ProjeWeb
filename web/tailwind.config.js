/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#6750A4',
          dark: '#D0BCFF',
          DEFAULT: '#6750A4',
        },
        background: {
          light: '#FEF7FF',
          dark: '#141218',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1D1B20',
        },
        status: {
          approved: '#2E7D32',
          cancelled: '#C62828',
          pending: '#EF6C00',
          cancellation: '#6A1B9A',
        },
      },
    },
  },
  plugins: [],
}
