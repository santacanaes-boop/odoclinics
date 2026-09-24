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
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

module.exports = nextConfig;
