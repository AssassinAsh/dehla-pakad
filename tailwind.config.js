/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
      borderWidth: {
        1: "1px",
        3: "3px",
        6: "6px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        "seat-glow-gold": "seat-glow-gold 2s ease-in-out infinite",
        "seat-invite": "seat-invite 3s ease-in-out infinite",
        "fly-in": "fly-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "enhanced-pulse": "enhanced-pulse 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 4s ease infinite",
        ripple: "ripple 0.6s linear",
        "slide-up":
          "slide-up 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
        "bounce-in":
          "bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        shake: "shake 0.5s ease-in-out",
        spotlight: "spotlight 1.5s ease-out",
      },
      backdropBlur: {
        xs: "2px",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        104: "26rem",
        120: "30rem",
      },
      zIndex: {
        60: "60",
        70: "70",
        80: "80",
        90: "90",
        100: "100",
      },
      boxShadow: {
        glow: "0 0 20px rgba(59, 130, 246, 0.5)",
        "glow-yellow": "0 0 20px rgba(251, 192, 45, 0.5)",
        "glow-green": "0 0 20px rgba(34, 197, 94, 0.5)",
        "glow-red": "0 0 20px rgba(239, 68, 68, 0.5)",
        "inner-lg": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)",
        "inner-xl": "inset 0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      },
      colors: {
        "card-back": "#1a472a",
        "felt-green": "#0f5132",
        "felt-dark": "#052e16",
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      ringWidth: {
        3: "3px",
        6: "6px",
      },
      scale: {
        102: "1.02",
        103: "1.03",
      },
    },
  },
  plugins: [],
};
