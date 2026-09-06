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
        background: "#eef6fc",
        primary: {
          DEFAULT: "#1767a7",
          dark: "#0f4f83",
          soft: "#eaf5ff",
          hover: "#2b7eb8",
        },
        panel: {
          DEFAULT: "#ffffff",
          soft: "#f7fbff",
        },
        brandText: {
          DEFAULT: "#17324a",
          muted: "#70869a",
        },
        line: "#d8e8f4",
      },
      fontFamily: {
        tahoma: ["Tahoma", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
