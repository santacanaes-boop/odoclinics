# CLAUDE.md

Este archivo proporciona guía a Claude Code (claude.ai/code) para trabajar con el código de este repositorio.

## Estructura del repositorio (leer esto primero)

La raíz del repositorio es la raíz del proyecto Next.js (`package.json`,
`prisma/`, `src/`, etc.). Hasta la Fase 6 el código se distribuía como un
zip (`odoclinics-app-fase1 (1).zip`); ya no — el código está trackeado
directamente en git y todos los comandos de abajo se ejecutan desde la raíz
del repositorio.

El proyecto también incluye `ODOCLINICS_ESPECIFICACION_TECNICA.md`, la
especificación completa de producto/técnica (en español) a partir de la cual
se construyó este scaffold (modelo de datos, listado de módulos, hoja de
ruta por fases, tokens de marca, checklist de seguridad). Ante cualquier
requisito ambiguo, consulta las secciones numeradas de ese documento
referenciadas en el código antes de asumir algo.

## Comandos

```bash
npm install
cp .env.example .env          # rellena DATABASE_URL, NEXTAUTH_SECRET, SEED_PASSWORD_*

npx prisma migrate dev --name init   # o: npm run db:migrate
npm run db:seed                      # crea el rol "Administrador" + 2 usuarios reales
npm run db:studio                    # GUI de Prisma Studio

npm run dev                   # http://localhost:3000, redirige a /login
npm run build
npm run start
npm run lint                  # next lint
```

Todavía no hay suite de tests configurada (no hay Jest/Vitest/Playwright) —
no inventes comandos de test.

## Arquitectura

**Stack**: Next.js 14 (App Router) + TypeScript, NextAuth (proveedor de
credenciales), Prisma + PostgreSQL, Tailwind, Zod para validación de entrada.

### Filosofía de "núcleo vertical", no pantallas horizontales

Solo está implementada una parte de los módulos descritos en la
especificación (sección 4). Es intencional (ver `README.md`): en vez de
maquetar ~12 pantallas en superficie, la Fase 1 construye un único flujo
completo y seguro de principio a fin — autenticación → autorización en
servidor → auditoría → Pacientes → Agenda. Al ampliar la app, sigue el mismo
patrón (stack completo de auth/RBAC/auditoría para cada funcionalidad) en
vez de añadir una pantalla sin autorización real en el backend detrás. El
trabajo previsto para fases posteriores está marcado inline como
`// TODO Fase N`; no construyas esas funcionalidades salvo que se pida
explícitamente, y revisa esos TODO antes de asumir que algo falta por
descuido.

### Modelo de autorización (lo esencial a entender)

Los permisos nunca se confían desde el cliente. Toda ruta de API que toque
datos de pacientes o clínicos debe llamar a `requierePermiso()`
(`src/lib/rbac.ts`) antes de leer o escribir nada:

```ts
const { autorizado, session } = await requierePermiso("pacientes", "total");
if (!autorizado) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
```

- `Modulo` es el conjunto fijo de claves de módulo (`agenda`, `pacientes`,
  `laboratorio`, `contabilidad`, `stock`, `informes`, `marketing`,
  `seguimiento`, `proteccion_datos`, `roles`, `integraciones`, `inicio`).
- `NivelPermiso` es `"ninguno" | "lectura" | "total"`, ordenado y comparado
  numéricamente — el JSON `Rol.permisos` de cada rol mapea módulo → nivel.
- `src/middleware.ts` y el layout de servidor `(app)/layout.tsx` solo
  imponen "sesión válida" como primera barrera (redirigen a `/login`); **no**
  hacen autorización por módulo.
- Las páginas de servidor de `src/app/(app)/**` que consultan Prisma
  directamente (sin pasar por una API) también llaman a
  `requierePermiso(modulo, "lectura")` al principio y, si no está
  autorizado, devuelven `<SinPermiso titulo="…" />`
  (`src/components/SinPermiso.tsx`). Toda página nueva con datos debe
  hacerlo — si no, un rol limitado podría ver el módulo entrando por URL.
- El `Sidebar` recibe los permisos desde el layout y oculta los módulos
  con nivel `"ninguno"`; es solo cosmético, la barrera real es lo anterior.

### Auditoría

Toda ruta de API que toca datos de `Paciente`/`Cita` —incluidas las simples
lecturas, no solo las escrituras— llama a `registrarAuditoria()`
(`src/lib/audit.ts`) tras la operación, registrando `usuarioId`, `accion`,
`entidad`, `entidadId`. Esto responde a la normativa española de datos
sanitarios (LOPD-GDD, referenciada como "sección 7" en el código): registrar
*quién consulta* una ficha de paciente es tan obligatorio como registrar
quién la modifica. Las rutas nuevas sobre datos sensibles también lo
necesitan.

### Detalles de autenticación (`src/lib/auth.ts`)

- Proveedor de credenciales (email/password vía bcrypt), estrategia de
  sesión JWT.
- Bloqueo de cuenta: 5 intentos fallidos → bloqueo de 15 min
  (`bloqueadoHasta` en `Usuario`).
- El `maxAge` de sesión es de 15 minutos — deliberado, porque la app se usa
  en una tablet compartida en consulta, no un error.
- MFA real (TOTP) implementado desde la Fase 6 (`src/lib/mfa.ts`, página
  `/mfa`) — no se fuerza automáticamente para todos los roles, cada usuario
  lo activa desde su cuenta. Ver el README del scaffold para el detalle.

### Modelo de datos (`prisma/schema.prisma`)

Un único fichero de schema contiene todas las entidades de la sección 5 de
la especificación: `Usuario`/`Rol` (auth+RBAC), `RegistroAuditoria`,
`Paciente` y sus registros clínicos relacionados (`Anamnesis`,
`HistorialTratamiento`, `PiezaOdontograma` — 32 piezas, notación FDI,
`Receta`, `Radiografia`, `Consentimiento`, `Presupuesto`), y `Cita` (citas,
con un índice `[gabinete, fechaHora]` usado para comprobar solapes). Los
campos comentados `// CIFRAR` (DNI/NIE, teléfono, dirección, anamnesis,
mfaSecret) van cifrados en BD desde la Fase 6, de forma transparente vía
Prisma Client Extensions (`src/lib/cifrado.ts`, aplicado en
`src/lib/prisma.ts`) — ninguna ruta necesita cifrar/descifrar a mano. Sigue
marcando `// CIFRAR` en cualquier campo sensible nuevo y añádelo a esa
extensión en vez de dejarlo en texto plano.

La validación de solapes de `Cita` (`src/app/api/citas/route.ts`) se hace
trayendo las citas del mismo día y mismo `gabinete` y comparando los rangos
horarios en memoria, en vez de una consulta SQL de solape — es deliberado
por legibilidad, no un descuido.

### Estructura de rutas

- `src/app/(app)/...` — shell autenticado de la app (`layout.tsx` envuelve
  `Sidebar` + contenido de página, redirige a usuarios no autenticados).
- `src/app/api/**/route.ts` — route handlers estilo REST; cada uno: valida
  la entrada con Zod, llama a `requierePermiso`, hace la operación de
  Prisma, y llama a `registrarAuditoria`.
- Alias de rutas `@/*` → `src/*` (ver `tsconfig.json`).

### Tokens de marca

Los colores/fuentes de `tailwind.config.ts` (escala púrpura, acento `mint`,
`danger` reservado exclusivamente a avisos médicos/urgentes,
Fraunces/Inter/JetBrains Mono) están tomados literalmente de la sección 2 de
la especificación y del prototipo `odoclinics.html`. No inventes nuevos
valores de paleta — extiende a partir de estos tokens.

### Convención de idioma

Los nombres de modelos, campos, la lógica de las rutas y los comentarios
están escritos en español en todo el proyecto (siguiendo el documento de
especificación y el dominio de la clínica). Mantén esta convención para
código nuevo en este proyecto en vez de cambiar a identificadores en inglés.

## Herramientas MCP opcionales (entorno local de desarrollo)

Este apartado documenta configuración **local y por desarrollador** de
Claude Code, no del proyecto en sí — no se guarda ninguna clave en el repo.

Para habilitar el servidor MCP de Perplexity (búsqueda web/investigación
durante el desarrollo) en tu propio Claude Code:

```bash
claude mcp add perplexity --scope user --env PERPLEXITY_API_KEY=<tu_clave_real> -- npx -y @perplexity-ai/mcp-server
```

- `--scope user` lo registra en tu configuración global de Claude Code (no
  en este repositorio), así que persiste entre proyectos y sesiones locales.
- Sustituye `<tu_clave_real>` por tu propia API key de Perplexity
  (https://www.perplexity.ai/settings/api) — nunca la commitees ni la
  pegues en este fichero.
- En una sesión remota/efímera de Claude Code on the web este comando no
  persiste: hay que ejecutarlo en tu máquina local.
