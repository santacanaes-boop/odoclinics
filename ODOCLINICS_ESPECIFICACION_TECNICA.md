# ODOCLINICS — Especificación técnica del proyecto

**Sistema de gestión integral para clínica dental**
Documento de traspaso para continuar el desarrollo en Claude Code.

---

## 0. Cómo usar este documento

Este archivo resume todo lo diseñado y prototipado hasta ahora para Odoclinics, de forma que un desarrollador (o Claude Code) pueda continuar el proyecto sin perder contexto. Contiene:

1. Resumen del proyecto y la clínica
2. Identidad de marca
3. Estado actual (prototipo funcional en HTML)
4. Especificación módulo a módulo (qué existe como prototipo y qué falta para ser real)
5. Modelo de datos propuesto
6. Cumplimiento normativo (sector dental en España)
7. Seguridad y ciberseguridad
8. Integraciones (IA, APIs, dispositivos clínicos)
9. Stack tecnológico recomendado
10. Hoja de ruta de desarrollo sugerida
11. Decisiones pendientes

**Instrucción sugerida para Claude Code al arrancar:**
> "Lee este documento completo antes de escribir código. Es la especificación funcional de Odoclinics, un sistema de gestión de clínica dental. Existe un prototipo HTML de referencia (`odoclinics.html`) que muestra el diseño visual y el flujo de cada pantalla; úsalo como referencia de UI pero constrúyelo como una aplicación real con backend, base de datos y autenticación, siguiendo el stack recomendado en la sección 9."

---

## 1. Resumen del proyecto

- **Nombre:** Odoclinics
- **Sector:** Clínica dental privada
- **Ubicación:** Av. Rovira Roure 5, altell 5, Lleida (España) · Tel. +34 628 134 872
- **Estructura física:** 2 gabinetes (sin asignación fija de profesional por gabinete)
- **Equipo actual:**
  - **Dra. Olivia Domínguez Choque** — Odontóloga · Administradora (acceso total)
  - **Jaume Santacana** — Gerencia (acceso total, de momento)
  - *(Sistema preparado para añadir más personal con permisos restringidos por rol — ver sección 4.11)*
- **Dispositivos objetivo:** Lenovo Idea Tab Pro 12.7" (tablet, uso principal en consulta) + PC de escritorio (uso administrativo)
- **Idiomas:** Castellano y Català (selector en la interfaz)

### Objetivo del sistema
Sustituir procesos dispersos (papel, Excel, WhatsApp personal, distintas apps) por una única plataforma que cubra: gestión de pacientes e historia clínica, agenda, contabilidad, stock, laboratorio protésico, marketing, comunicación automatizada con pacientes, cumplimiento normativo (RGPD/LOPD-GDD/Veri-Factu) e integración con dispositivos clínicos y herramientas de IA.

---

## 2. Identidad de marca

| Elemento | Valor |
|---|---|
| Color primario | `#7A1F82` (morado/violeta corporativo) |
| Escala de morados | `#33103B` (900) · `#4C1652` (800) · `#7A1F82` (700) · `#93379B` (600) · `#B871BF` (400) · `#E9CFEC` (200) · `#F5E9F6` (100) |
| Color de acento | `#7FB8AE` (verde-menta, extraído del propio logo) |
| Fondo general | `#FAF8FA` |
| Tipografía de titulares | Fraunces (serif, 500/600/700) |
| Tipografía de cuerpo | Inter (400/500/600/700) |
| Tipografía monoespaciada (códigos, cifras) | JetBrains Mono |
| Logotipo | Trazo caligráfico de un diente en dos tonos (azul claro / menta) sobre fondo morado. Debe incrustarse como asset propio (SVG idealmente) en la app real, no como captura de pantalla. |

**Principios de diseño ya validados:**
- Iconos SIEMPRE acompañados de texto (nunca solo icono) — legibilidad en tablet
- Interruptores (toggles) en vez de checkboxes pequeños — targets táctiles grandes
- Color de alerta (`--danger`, rojo) reservado exclusivamente para avisos médicos/urgentes, no para uso decorativo
- Layout de panel lateral fijo + contenido principal, colapsable a menú hamburguesa en tablet/móvil

---

## 3. Estado actual del proyecto

- Existe un **prototipo funcional single-file HTML** (`odoclinics.html`) con HTML/CSS/JS vanilla + Chart.js (gráficas) + jsPDF (generación de PDF).
- El prototipo **no tiene backend, base de datos ni autenticación real** — todos los datos son de ejemplo (hardcoded) y viven solo en memoria del navegador.
- Sirve como **especificación visual e interactiva completa**: todas las pantallas, flujos, textos y microinteracciones ya están decididos y probados.
- **Recomendación:** no partir de cero en el diseño. Usar el HTML como referencia pixel-a-pixel de cada pantalla, y reconstruirlo con un framework real (ver sección 9) conectado a una base de datos.

---

## 4. Especificación módulo a módulo

Cada módulo se describe con: **qué hace en el prototipo** (ya validado) y **qué necesita para ser real**.

### 4.1 Inicio (Dashboard)
- KPIs: citas hoy, ocupación de agenda, consentimientos pendientes, material con stock bajo
- Grid de accesos directos a los 10 módulos principales
- **Nota de diseño importante:** los datos financieros (facturación, deudas) NO van en Inicio — están consolidados en Contabilidad, para que el dashboard principal sea operativo, no económico
- **Para producción:** los KPIs deben calcularse en tiempo real desde la base de datos (no hardcoded), idealmente cacheados/agregados para rendimiento

### 4.2 Agenda
- Vista diaria con navegación por fecha (‹ Ayer / Hoy ›)
- **Solo 2 columnas: Gabinete 1 y Gabinete 2** — sin nombre de doctor visible en la rejilla (la clínica tiene una sola odontóloga por ahora, así que no aporta valor mostrar el nombre; el sistema debe estar preparado para añadir profesionales en el futuro sin rehacer la vista)
- KPIs: citas hoy, % ocupación, huecos libres, cancelaciones
- **Para producción:**
  - Vista real de calendario (día/semana/mes) con slots configurables por duración de tratamiento
  - Crear/editar/cancelar cita, con validación de solapes por gabinete
  - Estado de cita: confirmada / pendiente confirmación / cancelada / no-show
  - Disparar automáticamente las automatizaciones de recordatorio (ver 4.9) al crear una cita

### 4.3 Pacientes (módulo central)
Listado con búsqueda, filtro por saldo pendiente y estado de consentimientos. Al abrir un paciente, la ficha se organiza en **2 grupos de pestañas** (selector superior 🩺 Clínico / 📋 Administrativo):

**Grupo Clínico:**
1. **Anamnesis** — cuestionario de salud general (patologías previas, alergias medicamentosas, medicación habitual, hábitos). Parte obligatoria de la historia clínica según la Ley 41/2002. Debe poder enviarse al paciente para autocompletar antes de la primera visita.
2. **Historial médico** — tabla de tratamientos realizados: fecha, concepto médico, precio, estado de pago (pagado/parcial/pendiente). Conservación mínima legal: 5 años desde la última asistencia.
3. **Odontograma** — 32 piezas en notación FDI (18-11, 21-28, 48-41, 31-38), estado por pieza (sano/caries/empastado/corona/ausente), editable con leyenda de colores.
4. **Recetas** — histórico de medicación prescrita (medicamento, pauta, prescriptor), con botón para emitir receta electrónica (requiere integración con el sistema de receta electrónica del SNS/colegio profesional — ver 4.12).
5. **Radiografías** — galería de imágenes (panorámica, periapical, bite-wing...), con opción de subida manual y de recepción automática desde el sensor de rayos X conectado (ver 4.12).

**Grupo Administrativo:**
6. **Consentimientos** — checklist de consentimientos informados (firmado/pendiente) por tratamiento, con **firma digital táctil real** (canvas de dibujo, pensado para tablet) para firmar in situ delante del paciente.
7. **Presupuestos** — tabla de presupuestos (fecha, tratamiento, importe, estado: pendiente/aceptado), con **generación real de PDF** descargable con membrete de la clínica.
8. **Simulación IA** — subida de foto de la sonrisa del paciente + selector de tratamiento (blanqueamiento/carillas/ortodoncia/corona) + selector de tono VITA (para blanqueamiento) → genera comparador antes/después con deslizador. *En el prototipo el "después" es una aproximación visual (ajuste de brillo/saturación); en producción requiere conectar con un modelo real de generación/edición de imágenes (ver 4.12).*

**Estado vacío:** al crear un paciente nuevo, todas las pestañas deben mostrar un estado vacío claro (mensaje + CTA), nunca datos de otro paciente ni placeholders engañosos.

**Modo presentación al paciente:** botón que abre una pantalla a pantalla completa (sin menús ni navegación), pensada para enseñar en la tablet al propio paciente: su odontograma y el presupuesto propuesto con el importe total, para ayudar a decidir el tratamiento.

**Para producción:**
- CRUD completo de paciente con validación de DNI/NIE, datos de contacto, alertas médicas destacadas (alergias, anticoagulantes) visibles en la cabecera de la ficha siempre
- Subida de archivos real (radiografías, fotos) a almacenamiento cifrado
- Registro de auditoría: quién ha visto/editado cada historial y cuándo (obligatorio LOPD-GDD)

### 4.4 Laboratorio protésico
- Tabla de encargos externos: paciente, trabajo, laboratorio, fecha de envío, entrega estimada, estado (en proceso/lista para colocar/retraso)
- KPIs: encargos en curso, listos para colocar, con retraso, coste del mes
- **Para producción:** vincular con el paciente y con el presupuesto/tratamiento correspondiente; notificación automática cuando un encargo cambia de estado; posible integración directa con el escáner intraoral y la impresora 3D (ver 4.12)

### 4.5 Contabilidad
- KPIs: ingresos del mes, gastos del mes, beneficio neto, IVA a liquidar, deudas pendientes
- Gráfica de evolución ingresos vs. gastos
- Listado de últimas facturas
- **Facturación electrónica (Veri-Factu):** panel de estado de cumplimiento, facturas verificadas, último envío a AEAT
- **Cuenta bancaria:** IBAN, saldo, últimos movimientos, botón de gestión (pensado para integración Open Banking/PSD2)
- **Integración con programa contable (PGC):** selector de software (ContaSOL, A3, Sage, Holded...), tabla de mapeo de cuentas del Plan General Contable (700 ventas, 600/602 compras, 477/472 IVA, 430 clientes), exportación de asientos
- **Para producción:**
  - Facturación real conforme a Veri-Factu (registro inalterable, huella electrónica, envío AEAT) — **requisito legal, no opcional, para software de facturación en España**
  - Conciliación bancaria automática vía Open Banking (PSD2)
  - Exportación real a formato compatible con ContaSOL u otros

### 4.6 Stock y compras
- Inventario con nivel de stock (barra de progreso) y alertas de stock bajo
- Pedidos a proveedores en curso, con estado
- **Para producción:** alertas automáticas de reposición por umbral mínimo, generación de pedido de compra semi-automática, histórico de precios por proveedor

### 4.7 Informes y estadísticas
- KPIs: ocupación media de agenda, % aceptación de presupuestos, nuevos pacientes/mes, valor medio por paciente
- Gráficas: ocupación semanal de agenda, producción semanal (con un solo profesional actualmente; preparado para desglosar por profesional cuando el equipo crezca)
- **Para producción:** motor de informes configurable, exportación a PDF/Excel, comparativas interanuales

### 4.8 Marketing y RRSS
- KPIs: visitas web, nuevos leads, seguidores Instagram, reseñas Google
- Calendario de contenidos (redes sociales, email)
- Gráfica de origen de nuevos pacientes
- **Para producción:** integración real con Meta Business (Instagram/Facebook), Google Business Profile API, y el proveedor de email marketing

### 4.9 Seguimiento y Comunicación (CRM ligero)
Reutiliza el mismo motor de automatizaciones de mensajería para hacer seguimiento del paciente, en 3 pestañas:
1. **Automatizaciones** — reglas activables: recordatorio 24h antes de cita, confirmación de reserva, aviso de revisión anual, encuesta de satisfacción, recordatorio de pago pendiente, seguimiento de presupuesto sin agendar
2. **Seguimiento de pacientes** — tablero tipo kanban con 4 columnas automáticas: En tratamiento / Revisión pendiente / Inactivo (+12 meses sin visita) / Fidelizado
3. **Recomendaciones** — avisos accionables generados por reglas (ej. "8 meses desde la última limpieza → enviar recordatorio") con botón de envío directo
- **Para producción:** las reglas deben ejecutarse como jobs programados (cron) contra la base de datos real; los envíos van vía WhatsApp Business API y proveedor de email (ver 4.12)

### 4.10 Protección de datos (3 pestañas)
1. **RGPD y copias de seguridad** — checklist de cumplimiento (registro de actividades art. 30, contratos de encargado de tratamiento, conservación de historiales, consentimientos, cifrado/control de accesos) + histórico de copias de seguridad (diaria, cifrada, retención 12 meses)
2. **Equipos y esterilización** — trazabilidad de autoclaves, controles biológicos de esporas, calibraciones de equipos de radiología, mantenimiento de compresores/turbinas — **exigido por normativa sanitaria**
3. **Ciberseguridad** — checklist de requisitos para la aplicación real (ver sección 7 de este documento, es el mismo contenido)

### 4.11 Roles y permisos
- Estado actual: **ambos usuarios (Dra. Domínguez Choque y Jaume Santacana) tienen acceso total**, con aviso explícito en pantalla de que esto es así mientras el equipo sea reducido
- **Plantilla de permisos por módulo** ya preparada (10 módulos × toggle de acceso) con selector de rol (Recepción / Higienista-auxiliar / Gestoría externa / Otro), lista para activarse sin rediseño cuando se contrate más personal
- **Para producción:** los permisos deben aplicarse en el backend (autorización a nivel de API), nunca solo ocultando elementos en el frontend — un permiso ocultado visualmente pero no bloqueado en el servidor no es seguridad real

### 4.12 Integraciones y IA (panel central de conexiones)
Dos pestañas:

**Software y agentes IA:**
- Generación de imágenes IA (motor real del Simulador de tratamiento — candidatos: Google Imagen, DALL·E, Stability AI)
- Agente conversacional IA (para automatizar WhatsApp/email y alimentar las Recomendaciones — candidatos: Claude, GPT, Gemini)
- WhatsApp Business API
- Email/SMTP
- Programa contable (enlaza con 4.5)
- Banca/Open Banking (enlaza con 4.5)
- Conector genérico para cualquier herramienta futura: nombre, tipo (Agente IA / API REST / Webhook / Servidor MCP), endpoint, credenciales

**Dispositivos y maquinaria clínica:**
- Máquina de rayos X / RVG → envía directo a Radiografías (4.3.5)
- Escáner intraoral (iTero, 3Shape TRIOS, Medit) → alimenta Odontograma (4.3.3) y Laboratorio protésico (4.4)
- Ortopantomógrafo (panorámica)
- Cámara intraoral → alimenta expediente y Simulación IA (4.3.8)
- Impresora 3D/fresadora → enlaza con Laboratorio protésico
- Autoclave con control digital → enlaza con Equipos y esterilización (4.10.2)
- Conector genérico para cualquier dispositivo futuro: tipo de equipo, tipo de conexión (USB/red/Bluetooth/DICOM/carpeta compartida), gabinete de instalación

**Nota de seguridad ya incorporada en el propio prototipo:** *"Las claves de API se gestionarían de forma cifrada en el servidor de la aplicación real — nunca visibles en el código del cliente."* Esto es un requisito de diseño, no solo un texto informativo.

---

## 5. Modelo de datos propuesto (entidades principales)

```
Paciente
 ├─ id, nombre, DNI/NIE, fecha_nacimiento, teléfono, email, dirección
 ├─ alertas_médicas[] (alergias, anticoagulantes...)
 ├─ Anamnesis (1:1) — patologías[], alergias_medicamentosas, medicación_habitual, hábitos, fecha_actualización
 ├─ HistorialTratamiento[] (1:N) — fecha, concepto, precio, estado_pago
 ├─ Odontograma (1:1) — 32 registros pieza→estado
 ├─ Receta[] (1:N) — fecha, medicamento, pauta, prescriptor_id, estado
 ├─ Radiografia[] (1:N) — tipo, fecha, archivo_url, dispositivo_origen
 ├─ Consentimiento[] (1:N) — tipo, estado, fecha_firma, firma_imagen_url
 ├─ Presupuesto[] (1:N) — fecha, líneas[], importe_total, estado
 └─ SimulacionIA[] (1:N) — tratamiento, tono, imagen_antes_url, imagen_despues_url

Cita
 ├─ id, paciente_id, gabinete (1|2), fecha_hora, duración, tratamiento, estado
 └─ profesional_id (preparado para cuando haya más de un odontólogo)

Usuario
 ├─ id, nombre, email, rol_id, activo
 └─ Rol → permisos_por_módulo[] (mapa módulo→boolean/nivel)

Factura
 ├─ id, paciente_id, líneas[], importe, estado, hash_verifactu, fecha_envío_aeat

Producto (Stock)
 ├─ id, nombre, categoría, stock_actual, stock_mínimo, proveedor_id

PedidoCompra
 ├─ id, proveedor_id, líneas[], estado, fecha_pedido, fecha_entrega_estimada

EncargoLaboratorio
 ├─ id, paciente_id, laboratorio_id, trabajo, fecha_envío, fecha_entrega_estimada, estado

AutomatizacionMensaje
 ├─ id, disparador, canal (whatsapp|email), activa, plantilla

DispositivoClinico / IntegracionSoftware
 ├─ id, tipo, nombre, estado_conexión, credenciales_cifradas, gabinete
```

---

## 6. Cumplimiento normativo (sector dental — España)

- **RGPD + LOPD-GDD** — datos de salud son categoría especial; requieren registro de actividades de tratamiento (art. 30), base legal específica, y medidas de seguridad reforzadas
- **Ley 41/2002 de autonomía del paciente** — historia clínica, consentimiento informado, conservación mínima de 5 años desde la última asistencia
- **Veri-Factu** — obligatorio progresivamente en España desde 2026 para software de facturación: registro inalterable con huella electrónica, opción de remisión automática a la AEAT
- **Normativa sanitaria de esterilización y equipos** — trazabilidad de ciclos de autoclave, controles biológicos, calibraciones
- **Notificación de brechas de seguridad** — protocolo obligatorio a la AEPD en un plazo de 72 horas

---

## 7. Seguridad y ciberseguridad (checklist para producción)

> El prototipo actual no tiene datos reales ni superficie de ataque real — esta sección aplica **obligatoriamente** en cuanto exista backend con datos de pacientes.

**Autenticación y accesos**
- [ ] Autenticación multifactor (MFA), obligatoria para roles con acceso a historiales clínicos
- [ ] Bloqueo de cuenta tras intentos fallidos + política de contraseñas robustas
- [ ] Cierre de sesión automático por inactividad (clave en tablet compartida en consulta)
- [ ] Permisos por rol aplicados en el servidor, no solo ocultos en la interfaz

**Cifrado**
- [ ] HTTPS/TLS obligatorio en todo momento
- [ ] Base de datos cifrada en reposo + cifrado adicional a nivel de campo para historiales y radiografías
- [ ] Copias de seguridad cifradas, en ubicación distinta al servidor principal

**Trazabilidad**
- [ ] Registro de auditoría de accesos a historiales (quién consulta, no solo quién modifica) — obligatorio LOPD-GDD

**Seguridad de la aplicación**
- [ ] Validación y saneado de inputs en servidor (protección SQL injection, XSS)
- [ ] Cookies de sesión `HttpOnly` + `Secure`, protección CSRF
- [ ] Ninguna clave de API en el código del cliente — gestión cifrada en servidor
- [ ] Rate limiting frente a fuerza bruta

**Infraestructura**
- [ ] Alojamiento dentro de la UE (idealmente España) por residencia de datos RGPD
- [ ] Contratos de encargado de tratamiento firmados con todo proveedor que toque datos de pacientes (hosting, backups, mensajería, IA)
- [ ] Actualizaciones de seguridad periódicas

**Plan ante incidentes**
- [ ] Protocolo documentado de notificación de brechas a la AEPD (72h)
- [ ] Auditoría de seguridad (pentest) antes de producción con datos reales, y periódicamente después

---

## 8. Stack tecnológico recomendado

*(Punto de partida sugerido — a validar con el equipo de desarrollo)*

- **Frontend:** React (o Next.js) + Tailwind CSS — reutilizando el sistema de diseño ya definido en la sección 2
- **Backend:** Node.js (NestJS/Express) o similar, API REST o GraphQL
- **Base de datos:** PostgreSQL (relacional, con extensión para auditoría), con cifrado a nivel de campo para datos de salud
- **Almacenamiento de archivos:** S3-compatible (radiografías, fotos, PDFs), con cifrado en reposo
- **Autenticación:** OAuth2/OIDC + MFA (ej. Auth0, Clerk, o solución propia con librería probada)
- **Colas/jobs programados:** para automatizaciones de mensajería y recordatorios (ej. BullMQ + Redis)
- **Generación de PDF:** en servidor (ej. Puppeteer o librería PDF nativa), no solo en cliente
- **Integraciones externas:** WhatsApp Business API (Meta), proveedor de email transaccional, API de generación de imágenes IA, API de banca abierta (PSD2), conectores de dispositivos médicos (DICOM donde aplique)
- **Hosting:** proveedor con centro de datos en la UE

---

## 9. Hoja de ruta de desarrollo sugerida

**Fase 1 — Cimientos**
Autenticación + roles reales, modelo de datos base, CRUD de Pacientes con Anamnesis e Historial médico, Agenda funcional.

**Fase 2 — Clínico**
Odontograma editable, Consentimientos con firma digital real, Radiografías (subida + integración con rayos X), Recetas.

**Fase 3 — Administrativo y económico**
Presupuestos + PDF real, Contabilidad con Veri-Factu real, Stock y compras, integración bancaria.

**Fase 4 — Comunicación**
WhatsApp Business API real, automatizaciones programadas, CRM de seguimiento, Marketing.

**Fase 5 — IA e integraciones avanzadas**
Simulador de tratamiento con generación de imágenes real, agente conversacional IA, escáner intraoral, laboratorio protésico conectado.

**Fase 6 — Cumplimiento y endurecimiento**
Auditoría de seguridad completa (checklist sección 7), pentest, documentación RGPD definitiva, plan de continuidad y backups verificado.

---

## 10. Decisiones pendientes / preguntas abiertas

- ¿Proveedor definitivo de hosting/backend (España/UE)?
- ¿Proveedor de WhatsApp Business API (Meta directo o intermediario tipo Twilio/360dialog)?
- ¿Proveedor de generación de imágenes IA para el simulador de tratamiento?
- ¿Software contable definitivo a integrar (ContaSOL / A3 / Sage / Holded)?
- ¿Modelo/marca exacta del sensor de rayos X y escáner intraoral, para confirmar compatibilidad de integración (DICOM/STL)?
- Plan de migración de datos si existen historiales previos en papel o en otro sistema

---

## 11. Referencia visual

El archivo `odoclinics.html` adjunto en el proyecto es el prototipo interactivo completo: contiene las 12 vistas principales, la ficha de paciente con sus 8 sub-secciones, y todos los flujos descritos en este documento, ya con la identidad de marca aplicada. Úsalo como fuente de verdad visual mientras se construye la versión real.

---

*Documento generado a partir de la sesión de diseño y prototipado de Odoclinics. Refleja el estado del producto en el momento de su exportación a Claude Code para continuar el desarrollo.*
