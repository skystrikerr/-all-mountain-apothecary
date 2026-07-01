/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apothecary: {
          forest: '#1b3b2b',
          moss: '#4c6e5d',
          cream: '#f9f6f0',
          clay: '#c88a66',
        }
      }
    },
  },
  plugins: [],
}
