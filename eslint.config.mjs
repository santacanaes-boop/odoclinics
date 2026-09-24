import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Next.js 16 ya no incluye `next lint`: se usa ESLint directamente con la
// configuración oficial de Next (flat config).
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "odoclinics.html"] },
];

export default config;
