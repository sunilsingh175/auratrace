import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090d16",
        surface: "#111827",
        "surface-raised": "#1a2234",
        border: "#1f293d",
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
        },
        accent: {
          cyan: "#06b6d4",
          purple: "#8b5cf6",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
      animation: {
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-cyan": "glowCyan 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glowCyan: {
          "0%": { boxShadow: "0 0 10px rgba(6, 182, 212, 0.2)" },
          "100%": { boxShadow: "0 0 25px rgba(6, 182, 212, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
