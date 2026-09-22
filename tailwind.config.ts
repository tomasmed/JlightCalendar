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
        kiosk: {
          dark: "#0b0f19",
          card: "#151e32",
          border: "#232f48",
          accent: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
