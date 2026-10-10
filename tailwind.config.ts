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
          void: "var(--cosmos-void)",
          deep: "var(--cosmos-deep)",
          surface: "var(--cosmos-surface)",
          card: "var(--cosmos-card)",
          cardHover: "var(--cosmos-cardHover)",
          border: "var(--cosmos-border)",
          borderLight: "var(--cosmos-borderLight)",
        },
        starlight: {
          DEFAULT: "var(--starlight-default)",
          gold: "#f59e0b",
          cyan: "#38bdf8",
          purple: "#a855f7",
          pink: "#f472b6",
          white: "#f8fafc",
          pumpkin: "#f97316",
        },
      },
      backgroundImage: {
        "milky-way":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.25), transparent 70%), radial-gradient(circle at 80% 80%, rgba(56, 189, 248, 0.12), transparent 50%), radial-gradient(circle at 15% 50%, rgba(168, 85, 247, 0.15), transparent 45%)",
        "halloween-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249, 115, 22, 0.22), transparent 70%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.18), transparent 50%), radial-gradient(circle at 15% 50%, rgba(34, 197, 94, 0.12), transparent 45%)",
        "stardust-glow":
          "radial-gradient(circle at 50% 50%, rgba(255, 209, 102, 0.08), transparent 70%)",
      },
    },
  },
  plugins: [],
};
export default config;
