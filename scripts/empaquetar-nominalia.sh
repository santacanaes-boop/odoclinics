#!/usr/bin/env bash
# Genera exportacion-nominalia/odoclinics-nominalia.zip: la app ya compilada
# (Next.js standalone), lista para subir por el Administrador de archivos de
# cPanel y arrancar con "Setup Node.js App" sin ejecutar npm install ni
# next build en el servidor (los hostings compartidos suelen quedarse sin
# memoria compilando). Ver DESPLIEGUE_NOMINALIA.md.
set -euo pipefail

cd "$(dirname "$0")/.."
RAIZ="$(pwd)"
EXPORTACION="$RAIZ/exportacion-nominalia"
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
# Nunca empaquetar datos locales de pacientes ni secretos.
rm -rf "$APP/public/uploads" "$APP/almacenamiento" "$APP/exportacion-nominalia"
rm -f "$APP/.env"

# Schema + migraciones, para crear las tablas desde phpPgAdmin o psql.
cp -r prisma "$APP/prisma"
cp .env.example "$APP/.env.example"
# Los scripts de mantenimiento son TypeScript y el servidor no tendrá tsx: se
# compilan a .js (bcryptjs incluido; @prisma/client ya viene en standalone)
# para lanzarlos desde la terminal de cPanel con `node prisma/<script>.js`.
for script in seed reiniciarMfa; do
  npx esbuild "prisma/$script.ts" --bundle --platform=node --target=node20 \
    --external:@prisma/client --outfile="$APP/prisma/$script.js" --log-level=warning
done

mkdir -p "$EXPORTACION"
cp DESPLIEGUE_NOMINALIA.md "$EXPORTACION/"
rm -f "$SALIDA"
(cd "$TRABAJO" && zip -qr "$SALIDA" odoclinics)
echo "Paquete listo: $SALIDA ($(du -h "$SALIDA" | cut -f1))"
echo "SHA-256: $(sha256sum "$SALIDA" | cut -d' ' -f1)"
