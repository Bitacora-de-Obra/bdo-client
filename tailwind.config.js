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
        'idu-blue': 'var(--color-idu-blue)',
        'idu-cyan': 'var(--color-idu-cyan)',
        'brand-primary': 'var(--color-brand-primary)',
        'brand-secondary': 'var(--color-brand-secondary)',
        'brand-accent': 'var(--color-brand-accent)',
        'status-green': '#2E7D32',
        'status-yellow': '#F9A825',
        'status-red': '#C62828',
      },
    },
  },
  plugins: [],
}

