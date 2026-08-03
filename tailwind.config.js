/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Kasi palette: deep charcoal, vibrant green, warm gold, coral
        bg: {
          DEFAULT: "#0B0F0A", // near black with green tint
          soft: "#141A12",
          card: "#1A2117",
        },
        kasi: {
          green: "#22C55E",
          "green-deep": "#15803D",
          gold: "#FBBF24",
          coral: "#F87171",
          cream: "#FEF3C7",
          ink: "#0B0F0A",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(34, 197, 94, 0.35)",
        gold: "0 0 40px rgba(251, 191, 36, 0.4)",
      },
      animation: {
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
