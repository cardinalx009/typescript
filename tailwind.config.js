/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f2f6fc',
          100: '#e2ebf8',
          200: '#c3d6f0',
          300: '#8fb5e3',
          400: '#528bd2',
          500: '#2f6bbd',
          600: '#1f509c',
          700: '#1a3f81',
          800: '#16356a',
          900: '#0f2547',
          950: '#081733',
        },
      },
      boxShadow: {
        soft: '0 18px 45px -20px rgba(10, 37, 64, 0.35)',
      },
    },
  },
  plugins: [],
}
