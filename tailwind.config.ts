import type { Config } from "tailwindcss";

// Tokens de marca — sección 2 de ODOCLINICS_ESPECIFICACION_TECNICA.md
// No inventar valores nuevos: son los ya validados en el prototipo HTML.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: {
          900: "#33103B",
          800: "#4C1652",
          700: "#7A1F82", // primario
          600: "#93379B",
          400: "#B871BF",
          200: "#E9CFEC",
          100: "#F5E9F6",
        },
        mint: "#7FB8AE", // acento
        danger: "#C4362F", // reservado exclusivamente a avisos médicos/urgentes
        bg: "#FAF8FA",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
