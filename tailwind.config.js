/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        neo: {
          black: "#000000",
          white: "#fffef2",
          cream: "#fff8e7",
          yellow: "#ffe500",
          pink: "#ff6b9d",
          blue: "#00d4ff",
          green: "#7cff6b",
          purple: "#c792ff",
          orange: "#ff9e2c",
          red: "#ff4757",
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        brutal: "4px 4px 0 #000000",
        "brutal-lg": "6px 6px 0 #000000",
        "brutal-hover": "6px 6px 0 #000000",
        "brutal-active": "2px 2px 0 #000000",
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
