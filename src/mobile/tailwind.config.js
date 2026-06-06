/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Deep slate dark-mode palette
        slate: {
          900: "#000000",
          850: "#09090b",
          800: "#1f1f23",
        },
        primary: {
          emerald: "#10b981",
          'emerald-dark': "#34d399",
        },
        background: {
          dark: "#000000",
        },
        card: {
          dark: "#09090b",
        },
        border: {
          dark: "#27272a",
        }
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        shake: 'shake 0.5s ease-in-out',
        'bounce-in': 'bounce-in 0.5s ease-out',
        wiggle: 'wiggle 0.5s ease-in-out',
      }
    },
  },
  plugins: [],
};
