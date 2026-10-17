// Cabeceras de seguridad para todas las respuestas (sección 7).
// - CSP: solo recursos propios. 'unsafe-inline' en scripts es necesario
//   para los scripts de arranque de Next sin nonces; 'unsafe-eval' solo en
//   desarrollo (lo usa el recargado en caliente).
// - img-src data:/blob: para el QR del MFA y las previsualizaciones de
//   firma/simulación generadas en canvas.
const esDesarrollo = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const cabecerasSeguridad = [
  { key: "Content-Security-Policy", value: csp },
  // Nadie puede incrustar la app en un iframe (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Solo tiene efecto sobre HTTPS; obliga al navegador a no bajar a HTTP.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Genera .next/standalone con un server.js autocontenido, para subir la app
  // ya compilada a un hosting con cPanel ("Setup Node.js App") sin ejecutar
  // npm install ni next build en el servidor — ver DESPLIEGUE_NOMINALIA.md.
  output: "standalone",
  // pdfkit carga sus fuentes estándar (.cjs/.afm) del disco en tiempo de
  // ejecución: se deja fuera del bundle y se incluyen sus ficheros a mano
  // (el trazado no los detecta y el PDF de presupuestos fallaría con 500).
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/presupuestos/[id]/pdf": ["./node_modules/pdfkit/js/**"],
  },
  // sharp solo lo usa next/image, que la app no utiliza: ~45 MB menos.
  outputFileTracingExcludes: {
    "*": ["./node_modules/sharp/**", "./node_modules/@img/**"],
  },
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

module.exports = nextConfig;
