import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        
        "neo-white": "#FFFFFF",
        "neo-grey": "#E5E7EB",
        "neo-dark-grey": "#374151",
        "neo-black": "#111827",
        brand: {
          50: "#FEFCE8",
          500: "#EAB308",
          600: "#CA8A04",
          700: "#A16207",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        "neo-sm": "4px 4px 0px 0px rgba(17, 24, 39, 1)",
        "neo-md": "8px 8px 0px 0px rgba(17, 24, 39, 1)",
        "neo-lg": "12px 12px 0px 0px rgba(17, 24, 39, 1)",
      },
      borderRadius: {
        "neo": "0px",
      },
      animation: {
        "rise-in": "riseIn 650ms ease both",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
