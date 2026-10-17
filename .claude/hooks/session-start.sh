#!/bin/bash
# Prepara las sesiones de Claude Code en la nube: instala dependencias y
# genera el cliente de Prisma para que build, lint y tsc funcionen desde el
# primer momento. En local no hace nada.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
fi

npm install
npx prisma generate
