/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'white-shadow': '0 0 5px 2px white',
        'amber300-shadow': '0 0 15px 3px rgb(252 211 77)',
      }
    },
  },
  plugins: [],
}