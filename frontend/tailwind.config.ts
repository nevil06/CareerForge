import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          500: "#4f6ef7",
          600: "#3b55e6",
          700: "#2d43c9",
        },
      },
    },
  },
  plugins: [],
};
export default config;
