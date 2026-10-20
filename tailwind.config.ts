import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cosmos: {
          void: "rgb(var(--cosmos-void) / <alpha-value>)",
          deep: "rgb(var(--cosmos-deep) / <alpha-value>)",
          surface: "rgb(var(--cosmos-surface) / <alpha-value>)",
          card: "rgb(var(--cosmos-card) / <alpha-value>)",
          cardHover: "rgb(var(--cosmos-cardHover) / <alpha-value>)",
          border: "rgb(var(--cosmos-border) / <alpha-value>)",
          borderLight: "rgb(var(--cosmos-borderLight) / <alpha-value>)",
          text: "rgb(var(--cosmos-text) / <alpha-value>)",
          muted: "rgb(var(--cosmos-muted) / <alpha-value>)",
        },
        starlight: {
          DEFAULT: "var(--starlight-default)",
          tension: "var(--accent-tension)",
          focusText: "var(--focus-text)",
          gold: "#f59e0b",
          cyan: "#38bdf8",
          purple: "#a855f7",
          pink: "#f472b6",
          white: "#f8fafc",
          pumpkin: "#f97316",
        },
      },
    },
  },
  plugins: [],
};
export default config;
