#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

ZIP_FILE="odoclinics-app-fase1 (1).zip"
PROJECT_DIR="odoclinics-app-fase1/odoclinics-app"

# El código fuente real se distribuye como zip (ver CLAUDE.md) — hay que
# descomprimirlo antes de poder trabajar con npm/prisma/next.
if [ ! -d "$PROJECT_DIR" ]; then
  unzip -q "$ZIP_FILE" -d odoclinics-app-fase1
fi

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
fi

npm install
