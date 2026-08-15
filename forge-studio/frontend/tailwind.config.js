/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0c0c12",
        bg2: "#11111a",
        surface: "#191924",
        surface2: "#212130",
        line: "rgba(255,255,255,.08)",
        body: "#f0f0f4",
        dim: "#9c9cab",
        faint: "#61616e",
        accent: "#ff7319",
        ember: "#ff452b",
        good: "#34d97b",
        bad: "#ff5d5d",
        grape: "#b48bff",
      },
      backgroundImage: {
        fire: "linear-gradient(135deg, #ff7319, #ff452b)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
