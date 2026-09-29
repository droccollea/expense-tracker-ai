import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef5fd",
          100: "#d9e8fa",
          500: "#2a78d6",
          600: "#2163b5",
          700: "#1b4f91",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
      },
      keyframes: {
        "slide-in": { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "drawer-in": { from: { transform: "translateX(100%)" }, to: { transform: "none" } },
      },
      animation: {
        "slide-in": "slide-in 180ms ease-out",
        "fade-in": "fade-in 150ms ease-out",
        "drawer-in": "drawer-in 240ms cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
