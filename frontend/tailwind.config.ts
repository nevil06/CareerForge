import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fff8eb",
        soil: "#262018",
        moss: "#426b45",
        fern: "#6f9f63",
        sage: "#dce7cf",
        clay: "#c97446",
        sun: "#f2bf5e",
        lagoon: "#4e9c91",
        brand: {
          50: "#eef6e7",
          500: "#6f9f63",
          600: "#426b45",
          700: "#2f5135",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        organic: "0 24px 70px rgba(66, 54, 34, 0.14)",
        leaf: "0 16px 40px rgba(66, 107, 69, 0.18)",
      },
      borderRadius: {
        organic: "2rem 1.25rem 2.4rem 1.35rem",
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
