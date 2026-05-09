import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: {
          50: "#e8f3ec",
          100: "#c8e1d0",
          500: "#0f6b3c",
          600: "#0b5c33",
          700: "#084a29",
          900: "#04341c",
        },
        chip: {
          red: "#c0392b",
          gold: "#d4af37",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
