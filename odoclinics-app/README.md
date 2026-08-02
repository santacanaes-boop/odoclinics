# Odoclinics — Fase 1 (scaffold)

Punto de partida real para el desarrollo descrito en
`ODOCLINICS_ESPECIFICACION_TECNICA.md`. Este scaffold cubre el núcleo de la
**Fase 1** de la hoja de ruta (sección 9): autenticación + roles reales,
modelo de datos base, CRUD de Pacientes con Anamnesis e Historial médico, y
Agenda funcional.

## Qué incluye y por qué se construyó en este orden

En vez de maquetar las 12 pantallas en superficie, se ha construido un
**núcleo vertical completo**: autenticación → autorización en servidor →
auditoría → Paciente → Agenda. Esto es intencional: la sección 4.11 del
documento es explícita en que los permisos "deben aplicarse en el backend,
nunca solo ocultando elementos en el frontend" — así que antes de tener 12
módulos con poca profundidad, se prioriza tener un flujo real y seguro de
principio a fin.

- **Auth** (`src/lib/auth.ts`): NextAuth con credenciales, bloqueo de cuenta
  tras 5 intentos fallidos, sesión con caducidad de 15 min por inactividad
  (clave para la tablet compartida en consulta — sección 7). MFA queda
  marcado como `// TODO Fase 2`, es obligatorio antes de manejar pacientes
  reales.
- **RBAC en servidor** (`src/lib/rbac.ts`): cada API route llama a
  `requierePermiso()` antes de tocar datos. No hay ninguna ruta que confíe en
  que el frontend oculte un botón.
- **Auditoría** (`src/lib/audit.ts`): se registra tanto la lectura como la
  escritura de fichas de paciente — obligatorio LOPD-GDD (sección 7).
- **Modelo de datos** (`prisma/schema.prisma`): todas las entidades de la
  sección 5, con comentarios `// CIFRAR` en los campos que en producción
  necesitan cifrado a nivel de campo (no implementado aquí para no ocultar
  la lógica de negocio del scaffold bajo una capa de cifrado de ejemplo).
- **Agenda** (`src/app/api/citas/route.ts`): incluye la validación de
  solapes por gabinete que pide la sección 4.2.
- **Identidad de marca**: colores y tipografías (Fraunces/Inter/JetBrains
  Mono) tomados literalmente de la sección 2, no reinventados.

## Qué falta a propósito (siguientes fases)

Todo lo marcado `// TODO Fase N` en el código, y en general:

- Odontograma, Recetas, Radiografías, Consentimientos (firma digital),
  Presupuestos (PDF), Simulación IA → **Fase 2**
- Contabilidad/Veri-Factu real, Stock, integración bancaria → **Fase 3**
- WhatsApp Business API, automatizaciones programadas, CRM → **Fase 4**
- Simulador IA real, dispositivos clínicos (DICOM/STL) → **Fase 5**
- Pentest, cifrado de campo real, documentación RGPD definitiva → **Fase 6**

No se han creado páginas vacías para estos módulos para evitar el efecto
"12 pantallas a medias" — mejor añadirlas cuando tengan lógica real detrás.

## Arrancar en local

```bash
npm install
cp .env.example .env   # y rellena DATABASE_URL, NEXTAUTH_SECRET, etc.

npx prisma migrate dev --name init
npm run db:seed        # crea el rol Administrador + Dra. Domínguez / Jaume

npm run dev
```

Abre `http://localhost:3000` → redirige a `/login`.

Las contraseñas iniciales del seed son de un solo uso simbólico
(`cambiar-en-primer-login` si no defines `SEED_PASSWORD_*` en `.env`) —
cámbialas antes de cualquier uso real, y activa MFA en cuanto se implemente
en Fase 2.

## Antes de manejar pacientes reales

Revisa el checklist completo de la sección 7 del documento de
especificación. Como mínimo, no despliegues con datos reales sin:

- [ ] MFA activo para todo rol con acceso a historiales
- [ ] Cifrado de campo real en los campos marcados `// CIFRAR`
- [ ] Hosting en la UE
- [ ] HTTPS/TLS en todo momento
- [ ] Backups cifrados en ubicación distinta al servidor
