/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  presets: [require('nativewind/preset')],
  plugins: [require('tailwindcss-animate'), require('tailwindcss-motion')],
}
