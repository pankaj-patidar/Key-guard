import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f7f8ff",
        surface:    "#ffffff",
        "surface-2":"#eef0ff",
        border:     "#e2e0f9",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(99,102,241,0.08), 0 1px 2px -1px rgba(99,102,241,0.06)",
        "card-hover": "0 4px 12px 0 rgba(99,102,241,0.15), 0 2px 4px -1px rgba(99,102,241,0.1)",
        panel: "0 8px 30px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-up":  "fadeUp 0.35s ease-out both",
        "fade-in":  "fadeIn 0.2s ease-out both",
        shimmer:    "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
