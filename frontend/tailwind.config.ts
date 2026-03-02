import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        fuel: "#f97316",
        mist: "#f8fafc",
        accent: "#06b6d4"
      },
      fontFamily: {
        display: ["var(--font-space)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
