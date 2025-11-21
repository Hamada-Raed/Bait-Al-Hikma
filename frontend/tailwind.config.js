/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          50: '#1a1a1a',
          100: '#1f1f1f',
          200: '#2a2a2a',
          300: '#333333',
          400: '#404040',
          500: '#4a4a4a',
        },
        accent: {
          purple: '#8b5cf6',
          blue: '#3b82f6',
          teal: '#14b8a6',
        }
      },
    },
  },
  plugins: [],
}

