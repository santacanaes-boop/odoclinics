# Odoclinics — Fase 1 a 6 (scaffold)

Punto de partida real para el desarrollo descrito en
`ODOCLINICS_ESPECIFICACION_TECNICA.md`. Este scaffold cubre el núcleo de la
**Fase 1** de la hoja de ruta (sección 9): autenticación + roles reales,
modelo de datos base, CRUD de Pacientes con Anamnesis e Historial médico, y
Agenda funcional. La **Fase 2** añadió el resto de la ficha clínica:
Odontograma editable, Recetas, Radiografías (subida real) y Consentimientos
con firma digital táctil. La **Fase 3** añadió lo administrativo y
económico: Presupuestos con PDF real, Contabilidad y Stock y compras. La
**Fase 4** añadió comunicación: Seguimiento de pacientes (kanban real) con
Automatizaciones y Recomendaciones, y Marketing con calendario de
contenidos y origen de pacientes. La **Fase 5** añadió IA e integraciones
avanzadas: Laboratorio protésico y Simulación IA (aproximación visual, sin
generación real con IA todavía). La **Fase 6** añade cumplimiento y
endurecimiento de seguridad: MFA real, cifrado de campo real, rate
limiting y el módulo de Protección de datos — ver "Qué NO se ha hecho en
Fase 6" más abajo para lo que sigue pendiente de verdad (pentest,
migración de Next.js, decisión de hosting).

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
  (clave para la tablet compartida en consulta — sección 7), y rate
  limiting por IP (`src/lib/rateLimiter.ts`, en memoria — documentado que
  necesita Redis en un despliegue multi-instancia).
- **MFA real** (`/mfa`, `src/lib/mfa.ts`, `src/components/MfaSetup.tsx` +
  `MfaDesactivar.tsx`): TOTP de verdad con `otplib` — QR para escanear con
  Google Authenticator/Authy, confirmación con código, y segundo paso
  obligatorio en el login (`src/app/login/page.tsx`) para cualquier cuenta
  que lo active. No es obligatorio automáticamente para todos los roles
  (eso exigiría bloquear el acceso hasta configurarlo) — el dashboard
  muestra un aviso hasta que se activa.
- **RBAC en servidor** (`src/lib/rbac.ts`): cada API route llama a
  `requierePermiso()` antes de tocar datos. No hay ninguna ruta que confíe en
  que el frontend oculte un botón.
- **Auditoría** (`src/lib/audit.ts`): se registra tanto la lectura como la
  escritura de fichas de paciente — obligatorio LOPD-GDD (sección 7).
- **Modelo de datos** (`prisma/schema.prisma`): todas las entidades de la
  sección 5, con comentarios `// CIFRAR` en los campos que necesitan
  cifrado a nivel de campo.
- **Cifrado de campo real** (`src/lib/cifrado.ts`, aplicado vía Prisma
  Client Extensions en `src/lib/prisma.ts`): AES-256-GCM con el `crypto`
  nativo de Node, transparente para cada ruta — cifra `Paciente.telefono/
  email/direccion`, `Anamnesis.*` y `Usuario.mfaSecret` al escribir y
  descifra al leer, sin que ninguna ruta tenga que saberlo. `dniNie` usa
  cifrado **determinista** (misma entrada → mismo resultado) para no
  romper su `@unique` ni el login/búsqueda exacta; el trade-off consciente
  es que la búsqueda **parcial** de DNI ya no funciona (ver
  `src/lib/dniNie.ts` y el comentario en `src/app/api/pacientes/route.ts`).
  Requiere `CIFRADO_KEY` en `.env` (`openssl rand -base64 32`).
- **Agenda** (`src/app/api/citas/route.ts`): incluye la validación de
  solapes por gabinete que pide la sección 4.2.
- **Identidad de marca**: colores y tipografías (Fraunces/Inter/JetBrains
  Mono) tomados literalmente de la sección 2, no reinventados.
- **Odontograma** (`src/components/Odontograma.tsx`,
  `src/app/api/pacientes/[id]/odontograma/route.ts`): 32 piezas FDI,
  editables tocando cada pieza (rota su estado), con auditoría por cambio.
- **Recetas** (`src/components/Recetas.tsx`,
  `src/app/api/pacientes/[id]/recetas/route.ts`): alta de receta con
  medicamento/pauta; la emisión de receta electrónica real al SNS queda
  marcada `// TODO Fase 5` (requiere esa integración externa).
- **Radiografías** (`src/components/Radiografias.tsx`,
  `src/app/api/pacientes/[id]/radiografias/route.ts`): subida manual real de
  imágenes a almacenamiento local (`src/lib/storage.ts`, carpeta
  `almacenamiento/` fuera de `public/`). Solo se aceptan PNG, JPG o WebP
  de hasta 15 MB, comprobando el formato real por sus primeros bytes, y
  los archivos se sirven únicamente por `/api/archivos/...` con permiso de
  Pacientes y auditoría (`VER_ARCHIVO_CLINICO`); la recepción
  automática desde el sensor de rayos X queda `// TODO Fase 5`.
- **Consentimientos** (`src/components/Consentimientos.tsx` +
  `FirmaCanvas.tsx`, `src/app/api/consentimientos/[id]/firmar/route.ts`):
  alta de consentimiento pendiente y firma digital táctil real con canvas,
  pensada para firmar in situ en la tablet.
- **Presupuestos** (`src/components/Presupuestos.tsx`,
  `src/lib/presupuestoPdf.ts`): líneas + estado (pendiente/aceptado/
  rechazado), con generación real de PDF en servidor (pdfkit) con membrete
  de la clínica, descargable desde `/api/presupuestos/[id]/pdf`.
- **Contabilidad** (`/contabilidad`, `src/app/api/contabilidad/**`): KPIs
  (ingresos/gastos del mes, beneficio neto, deudas pendientes) calculados
  en tiempo real desde `Factura` y `Gasto`, alta de facturas y gastos.
  Veri-Factu, cuenta bancaria (Open Banking) e integración con programa
  contable se muestran como **pendientes explícitos** — no se simulan datos,
  requieren certificado digital/homologación y credenciales reales.
  `// TODO Fase 6`.
- **Stock y compras** (`/stock`, `src/app/api/stock/**`): inventario con
  alerta de stock bajo, alta de producto/proveedor, pedidos de compra que al
  marcarse "recibido" incrementan el stock real de cada producto
  (`src/app/api/stock/pedidos/[id]/route.ts`).
- **/pacientes/nuevo**: esta página no existía desde la Fase 1 — el enlace
  "+ Nuevo paciente" daba 404. Se construye en Fase 4 porque además es la
  única forma real de capturar `Paciente.origen`, el dato que necesita la
  gráfica de Marketing.
- **Seguimiento** (`/seguimiento`, sección 4.9): tres bloques reales, no
  maquetados —
  - *Automatizaciones*: las 6 reglas de la sección 4.9.1 se persisten y se
    activan/desactivan de verdad (`AutomatizacionMensaje`), pero el disparo
    efectivo contra WhatsApp/email no está implementado — requiere
    WhatsApp Business API, proveedor de email y un scheduler real.
    `// TODO Fase 6`.
  - *Seguimiento de pacientes*: kanban con 4 columnas calculadas en tiempo
    real desde las citas de cada paciente (`src/lib/seguimiento.ts`), no
    hay clasificación manual ni hardcoded.
  - *Recomendaciones*: avisos accionables calculados desde datos reales
    (revisión pendiente, presupuesto sin agendar, pago atrasado), con
    botón de contacto directo real vía enlaces `wa.me`/`mailto:`
    (`src/lib/contacto.ts`) — en vez de fingir una integración con
    WhatsApp Business API que no existe, abre WhatsApp o el email del
    profesional con el mensaje ya redactado.
- **Marketing** (`/marketing`, sección 4.8): calendario de contenidos real
  (alta + marcar publicado) y gráfica de origen de nuevos pacientes desde
  datos reales. Visitas web, seguidores Instagram, reseñas Google e email
  marketing se muestran como **pendientes explícitos**
  (`src/components/PanelPendiente.tsx`) — requieren Meta Business API,
  Google Business Profile API y un proveedor de email marketing reales.
- **Informes** (`/informes`, sección 4.7; `src/lib/informes.ts`): KPIs
  del mes calculados en tiempo real — facturado, cobrado, producción
  (tratamientos realizados), valor medio por paciente, nuevos pacientes,
  ocupación de agenda, aceptación de presupuestos (en número y en
  importe) y tasa de no-show — comparados con el mes anterior. Si el mes
  está en curso, se compara solo hasta hoy contra los mismos días del mes
  anterior, para no mostrar caídas falsas. Incluye ocupación y producción
  de las últimas 8 semanas, los tratamientos que más producen y el
  importe total en presupuestos pendientes de respuesta. La ocupación
  necesita `HORAS_GABINETE_SEMANA` en `.env`; sin ella se muestra
  "falta configurar" en vez de calcularse contra un horario inventado.
  Audita la consulta (`VER_INFORMES`). Exportación
  PDF/Excel, comparativas interanuales y desglose por profesional quedan
  pendientes (el desglose necesita `profesionalId` en
  `HistorialTratamiento`).
- **Laboratorio protésico** (`/laboratorio`, sección 4.4): encargos
  vinculados al paciente y al laboratorio, KPIs reales (en curso, listos
  para colocar, coste del mes), y "con retraso" **calculado** (no
  persistido) comparando `fechaEntregaEstimada` con la fecha actual —
  mismo patrón que "stock bajo" en Stock y compras.
- **Simulación IA** (`src/components/SimulacionIA.tsx`, sección 4.3.8):
  sube una foto real y genera un "después" mediante un ajuste de
  brillo/saturación en `<canvas>` — el mismo enfoque que ya usaba el
  prototipo HTML original (sección 3 de la especificación: *"el 'después'
  es una aproximación visual"*). Solo está disponible para blanqueamiento
  (es el único tratamiento donde un ajuste de brillo tiene sentido
  visual); para carillas/ortodoncia/corona se muestra explícitamente que
  no hay aproximación honesta sin un modelo de IA real. La UI deja claro
  en todo momento que **no es generación real con IA** — conectar un
  modelo real (Google Imagen, DALL·E, Stability AI) queda `// TODO Fase 6`.
- **Protección de datos** (`/proteccion-datos`, sección 4.10): checklist
  RGPD y checklist de ciberseguridad (mismo contenido que la sección 7)
  persistidos y marcables de verdad (`ChecklistItem`) — es una
  **atestación manual**: marcar un ítem confirma que el equipo ya lo ha
  configurado en su infraestructura real, esto no escanea nada
  automáticamente. Trazabilidad de esterilización real (altas de ciclos de
  autoclave + control biológico). El pentest se deja como pendiente
  explícito: no se puede sustituir por un checklist interno.

## Actualización de seguridad (tras la Fase 6)

- Next.js 14 → 16 y React 18 → 19 (`params`/`searchParams` asíncronos,
  `src/middleware.ts` → `src/proxy.ts`, ESLint con configuración plana
  en `eslint.config.mjs`).
- Los archivos subidos pasan de `public/uploads/` (se servían como
  estáticos) a `almacenamiento/`. **Si tienes archivos de pruebas en
  `public/uploads/`, muévelos a `almacenamiento/`**; sus URLs antiguas en
  BD (`/uploads/...`) deben pasar a `/api/archivos/...`.

## Qué NO se ha hecho en Fase 6 (y por qué)

- **Pentest y auditoría externa**: no se puede simular ni sustituir por
  código — requiere contratar una auditoría de seguridad real antes de
  manejar pacientes reales.
- **Hosting en la UE, HTTPS/TLS**: decisión de infraestructura, no de
  código de la aplicación.
- **Backups reales**: sin un hosting real que respaldar, no hay nada que
  automatizar de verdad — por eso "copias de seguridad configuradas" es un
  ítem marcable del checklist de Protección de datos, no un histórico de
  backups simulado.

## Qué falta a propósito (siguientes fases)

Todo lo marcado `// TODO Fase N` en el código, y en general:

- Generación real de imagen con IA para el simulador (Google Imagen,
  DALL·E, Stability AI), agente conversacional IA para automatizar
  WhatsApp/email, escáner intraoral, impresora 3D, dispositivos clínicos
  (DICOM/STL), receta electrónica SNS, sensor de rayos X conectado →
  **Fase 6** (todas requieren credenciales/hardware de terceros que no se
  pueden simular en un scaffold)
- WhatsApp Business API real, scheduler de automatizaciones, Meta Business
  API, Google Business Profile API, proveedor de email marketing →
  **Fase 6** (mientras tanto, Seguimiento usa enlaces `wa.me`/`mailto:`
  reales para contacto manual)
- Veri-Factu real (AEAT), integración bancaria (PSD2), exportación a
  programa contable → **Fase 6** (requieren certificado digital y
  credenciales de terceros)
- Pentest, almacenamiento S3-compatible cifrado
  (el almacenamiento de radiografías/firmas/simulaciones hoy es local en
  disco, ver `src/lib/storage.ts`), documentación RGPD definitiva, hosting
  en la UE con HTTPS/TLS real → ver "Qué NO se ha hecho en Fase 6"

No se han creado páginas vacías para los módulos que siguen sin lógica real
(Roles, Integraciones) para evitar el efecto "12 pantallas a
medias" — mejor añadirlas cuando tengan lógica real detrás.

## Arrancar en local

```bash
npm install
cp .env.example .env   # rellena DATABASE_URL, NEXTAUTH_SECRET y CIFRADO_KEY
                        # (CIFRADO_KEY: openssl rand -base64 32 — sección 7)

npx prisma migrate dev --name init
npm run db:seed        # crea el rol Administrador + Dra. Domínguez / Jaume

npm run dev
```

Abre `http://localhost:3000` → redirige a `/login`.

Las contraseñas iniciales del seed son de un solo uso simbólico
(`cambiar-en-primer-login` si no defines `SEED_PASSWORD_*` en `.env`) —
cámbialas antes de cualquier uso real, y activa MFA desde `/mfa` (Fase 6).

## Antes de manejar pacientes reales

Revisa el checklist completo de la sección 7 del documento de
especificación — ahora también marcable en `/proteccion-datos`. Como
mínimo, no despliegues con datos reales sin:

- [x] MFA disponible — actívalo desde `/mfa` para cada usuario (Fase 6)
- [x] Cifrado de campo real en los campos marcados `// CIFRAR` — necesita
      `CIFRADO_KEY` en `.env` (Fase 6)
- [x] Rate limiting básico frente a fuerza bruta (Fase 6, necesita Redis en
      multi-instancia)
- [x] Permisos por módulo comprobados en servidor también en las páginas
      (no solo en las APIs), con auditoría del listado de pacientes y de
      la agenda
- [ ] Hosting en la UE
- [ ] HTTPS/TLS en todo momento
- [ ] Backups cifrados en ubicación distinta al servidor (marcable en
      `/proteccion-datos` cuando esté configurado de verdad)
- [ ] Pentest / auditoría de seguridad externa
- [x] Next.js 16 + React 19 (`npm audit`: 0 vulnerabilidades)
- [x] Revisión de seguridad del código: validación estricta al editar
      pacientes, subidas solo de imágenes reales servidas con permiso y
      auditoría, bloqueo de cuenta también por códigos MFA erróneos,
      secreto MFA no sustituible con MFA activo, cabeceras de seguridad
      (CSP, anti-iframe, HSTS)
- [ ] Revisar `ipCliente()` en `src/lib/auth.ts` al elegir hosting: el
      rate limiting por IP depende de qué cabecera fija el proxy inverso
