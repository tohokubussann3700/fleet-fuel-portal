module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0a1628',
          surface: '#152742',
          accent: '#1e40af',
          accentLight: '#60a5fa',
        },
      },
    },
  },
  plugins: [],
};
