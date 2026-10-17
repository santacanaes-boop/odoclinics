# Despliegue en Nominalia (hosting compartido con cPanel) — versión DEMO

Esta guía sube la versión actual (Fases 1-6 + Informes, MFA obligatorio y
Next.js 16) a un hosting compartido de
Nominalia **para demo/pruebas con datos ficticios**. No es apta todavía para
pacientes reales: ver "Antes de pasar a pacientes reales" al final.

La app es Next.js + Node.js + PostgreSQL. **No es una web PHP**: no basta con
subir ficheros por FTP. Necesita que tu plan permita ejecutar aplicaciones
Node.js.

---

## Paso 0 — Comprobar que tu plan sirve (5 minutos, antes de nada)

Entra en tu cPanel de Nominalia y busca:

| Qué buscar en cPanel | Si existe | Si NO existe |
|---|---|---|
| **"Setup Node.js App"** (o "Node.js", sección Software) con versión **20.9 o superior** (Next.js 16 no arranca con menos) | Sigue | Este plan no puede ejecutar la app → ver "Plan B" |
| **"PostgreSQL Databases"** / phpPgAdmin | Usa la BD de Nominalia | Usa una BD PostgreSQL externa en la UE (ver Paso 2B) |
| **"Terminal"** o acceso **SSH** | Facilita el Paso 4 | Pide a soporte que te lo active |
| **SSL/TLS** o **AutoSSL / Let's Encrypt** | Activa HTTPS en el subdominio | Imprescindible: pídelo a soporte |

Si tienes dudas, pregunta a soporte de Nominalia literalmente:
*"¿Mi plan permite aplicaciones Node.js 20 con Phusion Passenger ('Setup
Node.js App'), bases de datos PostgreSQL y acceso SSH? ¿Qué límite de memoria
RAM tiene cada proceso?"* (la app necesita unos 300 MB de RAM en marcha).

**Plan B (si no hay Node.js):** contratar un VPS de Nominalia (o de otro
proveedor con centro de datos en la UE). Con un VPS se usa el mismo paquete
de esta guía, y además puedes instalar PostgreSQL, backups y Redis sin
limitaciones.

---

## Paso 1 — Generar el paquete (en tu ordenador o en Claude Code)

```bash
./scripts/empaquetar-nominalia.sh      # desde la raíz del repositorio
```

Genera `exportacion-nominalia/odoclinics-nominalia.zip` (~37 MB) con la
app **ya compilada**: el
servidor no tiene que ejecutar `npm install` ni `next build` (en hosting
compartido suelen fallar por falta de memoria). El script termina con
"Paquete listo" y la huella SHA-256 del zip.

Contenido del zip (carpeta `odoclinics/`):

- `server.js` → fichero de arranque
- `.next/`, `node_modules/` → app compilada y solo las dependencias necesarias
- `prisma/migrations/…/migration.sql` → SQL para crear las tablas
- `prisma/seed.js` → crea el rol Administrador y los 2 usuarios iniciales
- `prisma/reiniciarMfa.js` → reinicia el MFA de un usuario que perdió el móvil
- `.env.example` → lista de variables necesarias

## Paso 2 — Base de datos PostgreSQL

**2A. En Nominalia (si tu cPanel tiene "PostgreSQL Databases"):**

1. Crea una base de datos (p. ej. `cuenta_odoclinics`) y un usuario con
   contraseña larga. Asigna el usuario a la base de datos con todos los
   privilegios.
2. Tu `DATABASE_URL` será:
   `postgresql://USUARIO:CONTRASEÑA@localhost:5432/NOMBRE_BD`
   (si la contraseña tiene símbolos como `@`, `#` o `/`, usa una sin
   símbolos o codifícalos).

**2B. Externa (si Nominalia no ofrece PostgreSQL):** crea una BD PostgreSQL
gestionada en una región de la UE (p. ej. Frankfurt o París) y copia su
cadena de conexión. Para demo vale el plan gratuito de cualquier proveedor
conocido; para datos reales necesitarás contrato de encargado de
tratamiento (RGPD) con ese proveedor.

**Crear las tablas:** abre phpPgAdmin (o la consola SQL de tu proveedor),
selecciona la base de datos y ejecuta el contenido completo de
`prisma/migrations/<fecha>_init/migration.sql`. Debe terminar sin errores.

## Paso 3 — Subir y configurar la app

1. **Subdominio:** en cPanel → "Subdominios", crea p. ej.
   `app.odoclinics.es` (no uses el dominio principal si ahí está la web
   pública de la clínica).
2. **HTTPS:** cPanel → "SSL/TLS Status" → ejecuta AutoSSL para ese
   subdominio. No continúes sin el candado: la app maneja contraseñas.
3. **Subir:** cPanel → "Administrador de archivos" → en tu carpeta de
   usuario (fuera de `public_html`) sube `odoclinics-nominalia.zip` y
   pulsa "Extraer". Queda la carpeta `odoclinics/`.
4. **Crear carpeta de archivos de pacientes** (radiografías, firmas…), fuera
   de la app para que no se borre al actualizar: p. ej. `odoclinics-datos/`
   en tu carpeta de usuario.
5. **Setup Node.js App → Create Application:**
   - Node.js version: **20.9 o superior** (la más alta disponible)
   - Application mode: **Production**
   - Application root: `odoclinics`
   - Application URL: `app.odoclinics.es`
   - Application startup file: `server.js`
6. **Variables de entorno** (en esa misma pantalla, "Add variable"):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la del Paso 2 |
   | `NEXTAUTH_URL` | `https://app.odoclinics.es` (con https, sin barra final) |
   | `NEXTAUTH_SECRET` | cadena aleatoria larga (ver abajo) |
   | `CIFRADO_KEY` | clave de 32 bytes en base64 (ver abajo) |
   | `UPLOADS_DIR` | ruta completa a `odoclinics-datos`, p. ej. `/home/TUUSUARIO/odoclinics-datos` |
   | `NODE_ENV` | `production` |

   Para generar `NEXTAUTH_SECRET` y `CIFRADO_KEY` (cada una distinta), en la
   Terminal de cPanel o en tu ordenador: `openssl rand -base64 32`.

   **Guarda `CIFRADO_KEY` en un gestor de contraseñas.** Si se pierde o se
   cambia, todo lo cifrado (DNI, teléfonos, anamnesis…) queda ilegible para
   siempre.

7. Pulsa **Save** y luego **Restart**. (No pulses "Run NPM Install": el
   paquete ya trae sus dependencias.)

## Paso 4 — Crear los usuarios iniciales

En cPanel → Terminal (o SSH). Copia el comando "Enter to the virtual
environment" que muestra la pantalla de "Setup Node.js App" y ejecútalo;
luego:

```bash
cd ~/odoclinics
DATABASE_URL='la-misma-del-paso-2' \
SEED_PASSWORD_OLIVIA='contraseña-larga-1' \
SEED_PASSWORD_JAUME='contraseña-larga-2' \
node prisma/seed.js
```

Debe decir "Seed completado". Los usuarios son `olivia@odoclinics.es` y
`jaume@odoclinics.es`.

## Paso 5 — Probar

1. Abre `https://app.odoclinics.es` → debe llevarte a `/login`.
2. Entra con cada usuario: el MFA es **obligatorio**, la app te llevará a
   `/mfa` para escanear el QR con Google Authenticator o Authy antes de
   dejarte usar nada.
3. Crea un paciente ficticio, una cita, un presupuesto (descarga el PDF) y
   sube una radiografía de prueba: deben verse correctamente.

Estas comprobaciones ya se han hecho con el paquete en un servidor de
prueba: creación de tablas con `migration.sql`, seed, login con
configuración de MFA obligatorio, paciente, presupuesto + PDF, radiografía
con y sin sesión, Informes y cifrado del DNI en la BD.

### Si algo falla

- **Error 503 / la app no arranca:** mira el log (`stderr.log` en la
  carpeta `odoclinics/` o el enlace de logs de "Setup Node.js App").
  - `CIFRADO_KEY debe decodificar a exactamente 32 bytes` → regenera la
    clave con `openssl rand -base64 32`.
  - `Can't reach database server` → revisa `DATABASE_URL`.
  - `EADDRNOTAVAIL` o problemas con `HOSTNAME` → añade la variable
    `HOSTNAME` = `127.0.0.1` y reinicia.
  - El proceso se cierra solo sin error → límite de memoria del plan:
    consulta a soporte o pasa a VPS.
- **No puedo iniciar sesión / vuelve al login:** `NEXTAUTH_URL` debe ser
  exactamente la URL con `https://`.
- **Un usuario perdió el móvil del MFA:** en la Terminal (entorno virtual
  del Paso 4), `cd ~/odoclinics && DATABASE_URL='…' CIFRADO_KEY='…' node
  prisma/reiniciarMfa.js email@odoclinics.es`; al entrar lo configurará de
  nuevo.

## Actualizar a una versión nueva

1. Genera un nuevo zip (Paso 1).
2. Sube y extrae sobre `odoclinics/` (los archivos de pacientes están en
   `UPLOADS_DIR`, no se pierden).
3. Si la versión trae migraciones nuevas en `prisma/migrations/`, ejecuta
   en la BD el `migration.sql` de cada carpeta nueva, en orden.
4. "Setup Node.js App" → **Restart**.

---

## Limitaciones del hosting compartido (conocidas)

- **Rate limiting en memoria:** se reinicia si Passenger reinicia el
  proceso. Aceptable en demo; en producción, Redis o VPS.
- **Backups:** las copias de cPanel no sustituyen a backups cifrados en una
  ubicación distinta (requisito RGPD para datos de salud).
- **Rendimiento:** el proceso puede "dormirse" tras un rato sin visitas; la
  primera carga tarda unos segundos.

## Antes de pasar a pacientes reales

Pendiente del checklist de `README.md` y sección 7 de la especificación:

- [ ] Almacenamiento de radiografías/firmas cifrado en reposo (hoy en
      disco del servidor, protegido por login y auditado, pero sin cifrar)
- [ ] Backups cifrados fuera del servidor y prueba de restauración
- [ ] Contrato de encargado de tratamiento con Nominalia (y con el
      proveedor de BD si es externo), servidores en la UE
- [ ] Auditoría de seguridad externa (pentest)
- [ ] Valorar VPS en lugar de hosting compartido
