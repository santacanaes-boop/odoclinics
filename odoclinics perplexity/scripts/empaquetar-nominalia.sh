#!/usr/bin/env bash
# Genera odoclinics-nominalia.zip: la app ya compilada (Next.js standalone),
# lista para subir por el Administrador de archivos de cPanel y arrancar con
# "Setup Node.js App" sin ejecutar npm install ni next build en el servidor
# (los hostings compartidos suelen quedarse sin memoria compilando).
# Ver DESPLIEGUE_NOMINALIA.md.
set -euo pipefail

cd "$(dirname "$0")/.."
RAIZ="$(pwd)"
# El paquete se guarda en la carpeta de exportación de la raíz del repositorio
# (versionada en git), junto con la guía de despliegue.
EXPORTACION="$(cd "$RAIZ/.." && pwd)/exportacion-nominalia"
SALIDA="$EXPORTACION/odoclinics-nominalia.zip"
TRABAJO="$(mktemp -d)"
trap 'rm -rf "$TRABAJO"' EXIT

npm ci
npx prisma generate
# next build no conecta a la BD de verdad, pero NextAuth/Prisma esperan que
# las variables existan; los valores reales se ponen en cPanel, no aquí.
DATABASE_URL="${DATABASE_URL:-postgresql://build:build@localhost:5432/build}" \
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-solo-para-build}" \
  npm run build

APP="$TRABAJO/odoclinics"
cp -r .next/standalone "$APP"
# standalone no incluye los estáticos ni public/: hay que copiarlos al lado
# de server.js para que el propio servidor de Next los sirva.
mkdir -p "$APP/.next"
cp -r .next/static "$APP/.next/static"
if [ -d public ]; then cp -r public "$APP/public"; fi
rm -rf "$APP/public/uploads"   # nunca empaquetar subidas locales de pacientes
rm -f "$APP/.env"

# Schema + migraciones + seed, para poder crear las tablas desde el servidor
# (o desde tu ordenador apuntando a la BD de producción).
cp -r prisma "$APP/prisma"
cp .env.example "$APP/.env.example"
# El seed es TypeScript y el servidor no tendrá tsx: se compila a un único
# prisma/seed.js (bcryptjs incluido; @prisma/client ya viene en standalone)
# para lanzarlo desde la terminal de cPanel con `node prisma/seed.js`.
npx esbuild prisma/seed.ts --bundle --platform=node --target=node18 \
  --external:@prisma/client --outfile="$APP/prisma/seed.js" --log-level=warning

mkdir -p "$EXPORTACION"
cp DESPLIEGUE_NOMINALIA.md "$EXPORTACION/"
rm -f "$SALIDA"
(cd "$TRABAJO" && zip -qr "$SALIDA" odoclinics)
echo "Paquete listo: $SALIDA ($(du -h "$SALIDA" | cut -f1))"
