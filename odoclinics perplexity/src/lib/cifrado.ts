import crypto from "crypto";

// Cifrado de campo real (sección 7: "Base de datos cifrada en reposo +
// cifrado adicional a nivel de campo para historiales y radiografías").
// AES-256-GCM con el módulo `crypto` nativo de Node — sin depender de una
// librería externa, para que la lógica quede visible (mismo criterio que
// el resto del scaffold: nada de cajas negras).
//
// Formato almacenado: "v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>"
//
// CIFRADO_KEY debe ser una clave maestra de 32 bytes en base64 (genera una
// con `openssl rand -base64 32` — ver .env.example). De ella se derivan
// tres subclaves independientes por HMAC, una por uso, para que ningún
// modo de cifrado reutilice el material de otro.
//
// Nunca cambies CIFRADO_KEY una vez haya datos cifrados en producción sin
// un plan de re-cifrado explícito — perderías el acceso a todo lo cifrado.

function claveMaestra(): Buffer {
  const claveBase64 = process.env.CIFRADO_KEY;
  if (!claveBase64) {
    throw new Error(
      "Falta CIFRADO_KEY en el entorno — genera una con `openssl rand -base64 32` (ver .env.example)."
    );
  }
  const clave = Buffer.from(claveBase64, "base64");
  if (clave.length !== 32) {
    throw new Error("CIFRADO_KEY debe decodificar a exactamente 32 bytes (AES-256).");
  }
  return clave;
}

function derivarSubclave(etiqueta: string): Buffer {
  return crypto.createHmac("sha256", claveMaestra()).update(etiqueta).digest();
}

let cacheClaveAleatoria: Buffer | null = null;
let cacheClaveDeterminista: Buffer | null = null;
let cacheClaveIvDeterminista: Buffer | null = null;

function claveAleatoria(): Buffer {
  return (cacheClaveAleatoria ??= derivarSubclave("odoclinics:cifrado-aleatorio:v1"));
}
function claveDeterminista(): Buffer {
  return (cacheClaveDeterminista ??= derivarSubclave("odoclinics:cifrado-determinista:v1"));
}
function claveIvDeterminista(): Buffer {
  return (cacheClaveIvDeterminista ??= derivarSubclave("odoclinics:iv-determinista:v1"));
}

function empaquetar(iv: Buffer, authTag: Buffer, datos: Buffer): string {
  return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${datos.toString("base64")}`;
}

function desempaquetar(valor: string) {
  const [, ivB64, authTagB64, datosB64] = valor.split(":");
  return {
    iv: Buffer.from(ivB64, "base64"),
    authTag: Buffer.from(authTagB64, "base64"),
    datos: Buffer.from(datosB64, "base64"),
  };
}

function esValorCifrado(valor: string): boolean {
  return valor.startsWith("v1:");
}

/** Cifrado no determinista (IV aleatorio) — para campos que nunca se
 * buscan por coincidencia exacta ni tienen @unique: telefono, email,
 * dirección, anamnesis, mfaSecret. */
export function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv("aes-256-gcm", claveAleatoria(), iv);
  const datos = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  return empaquetar(iv, cifrador.getAuthTag(), datos);
}

export function descifrar(valor: string): string {
  // Valores sin el prefijo de versión son datos de antes de activar el
  // cifrado (seed, tests, migraciones) — se devuelven tal cual en vez de
  // romper la lectura.
  if (!esValorCifrado(valor)) return valor;
  const { iv, authTag, datos } = desempaquetar(valor);
  const descifrador = crypto.createDecipheriv("aes-256-gcm", claveAleatoria(), iv);
  descifrador.setAuthTag(authTag);
  return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString("utf8");
}

/** Cifrado DETERMINISTA: mismo texto de entrada → mismo resultado siempre.
 * Solo para dniNie, que tiene @unique en el schema y se busca por
 * coincidencia exacta — con IV aleatorio, dos altas del mismo DNI
 * producirían cifrados distintos y @unique dejaría de detectar el
 * duplicado, y el login/búsqueda por DNI dejaría de funcionar.
 *
 * Trade-off consciente: esto permite a quien comprometa la base de datos
 * saber qué filas comparten el mismo DNI — igual que ya delata el propio
 * índice @unique — pero no aporta la protección semántica completa que sí
 * tienen los campos cifrados con cifrar(). Es el compromiso habitual para
 * cifrar un identificador que necesita búsqueda exacta. La búsqueda
 * parcial de DNI (`contains`) deja de ser posible — ver
 * src/app/api/pacientes/route.ts.
 */
export function cifrarDeterminista(texto: string): string {
  const iv = crypto.createHmac("sha256", claveIvDeterminista()).update(texto).digest().subarray(0, 12);
  const cifrador = crypto.createCipheriv("aes-256-gcm", claveDeterminista(), iv);
  const datos = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  return empaquetar(iv, cifrador.getAuthTag(), datos);
}

export function descifrarDeterminista(valor: string): string {
  if (!esValorCifrado(valor)) return valor;
  const { iv, authTag, datos } = desempaquetar(valor);
  const descifrador = crypto.createDecipheriv("aes-256-gcm", claveDeterminista(), iv);
  descifrador.setAuthTag(authTag);
  return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString("utf8");
}
