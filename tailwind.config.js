/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
  ],
  theme: {
    extend: {
      colors: {
        'idu-blue': '#0033A0',
        'idu-cyan': '#00B0DA',
        'brand-primary': '#0D47A1',
        'brand-secondary': '#1976D2',
        'brand-accent': '#29B6F6',
        'status-green': '#2E7D32',
        'status-yellow': '#F9A825',
        'status-red': '#C62828',
      },
    },
  },
  plugins: [],
}

