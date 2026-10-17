/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Genera .next/standalone con un server.js autocontenido (solo las
  // dependencias que se usan de verdad), para poder subir la app ya compilada
  // a un hosting con cPanel ("Setup Node.js App") sin ejecutar npm install ni
  // next build en el servidor — ver DESPLIEGUE_NOMINALIA.md.
  output: "standalone",
  // Radiografías/firmas guardadas antes de mover el almacenamiento fuera de
  // public/ conservan URLs /uploads/... — se sirven por la ruta autenticada.
  async rewrites() {
    return [{ source: "/uploads/:subcarpeta/:nombre", destination: "/api/archivos/:subcarpeta/:nombre" }];
  },
  experimental: {
    // pdfkit carga sus fuentes estándar (.cjs/.afm) del disco en tiempo de
    // ejecución: se deja fuera del bundle para que standalone copie sus ficheros.
    serverComponentsExternalPackages: ["pdfkit"],
    // ...pero el trazado no detecta esas fuentes (se cargan por nombre), así
    // que se incluyen a mano para la ruta que genera el PDF de presupuestos.
    outputFileTracingIncludes: {
      "/api/presupuestos/[id]/pdf": ["./node_modules/pdfkit/js/**"],
    },
  },
};

module.exports = nextConfig;
