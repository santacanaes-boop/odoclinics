import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Almacenamiento local en disco, FUERA de `public/`: los archivos
// (radiografías, firmas, fotos de simulación) son datos de salud y no deben
// servirse como estáticos. Se entregan solo a través de
// /api/archivos/[...ruta], que comprueba permiso del módulo Pacientes y
// registra la consulta en auditoría (sección 7).
//
// Para producción (sección 4.3 y 7): esto debe sustituirse por almacenamiento
// S3-compatible con cifrado en reposo, tal como recomienda la sección 9.
const CARPETA_BASE = path.join(process.cwd(), "almacenamiento");

export const SUBCARPETAS = ["radiografias", "firmas", "simulaciones"] as const;
export type Subcarpeta = (typeof SUBCARPETAS)[number];

// Tamaño máximo por archivo. Una panorámica digital ronda los 2-10 MB.
export const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024;

// Solo formatos de imagen rasterizados. SVG queda fuera a propósito: puede
// contener JavaScript y ejecutarse al abrirlo en el navegador (XSS).
const TIPOS = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
} as const;
export type ExtensionImagen = keyof typeof TIPOS;

/**
 * Detecta el formato real por los primeros bytes del archivo (no por el
 * tipo que declara el navegador, que lo controla el cliente). Devuelve null
 * si no es PNG, JPEG o WebP.
 */
export function detectarImagen(archivo: Buffer): ExtensionImagen | null {
  if (archivo.length >= 8 && archivo.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (archivo.length >= 3 && archivo[0] === 0xff && archivo[1] === 0xd8 && archivo[2] === 0xff) {
    return "jpg";
  }
  if (
    archivo.length >= 12 &&
    archivo.subarray(0, 4).toString("ascii") === "RIFF" &&
    archivo.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/**
 * Lee un `File` de un formulario y lo valida como imagen. Devuelve el
 * contenido y su extensión real, o un mensaje de error para el usuario.
 */
export async function leerImagenSubida(
  archivo: FormDataEntryValue | null
): Promise<{ buffer: Buffer; extension: ExtensionImagen } | { error: string }> {
  if (!(archivo instanceof File)) return { error: "Falta el archivo" };
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return { error: "El archivo supera el tamaño máximo (15 MB)" };
  }
  const buffer = Buffer.from(await archivo.arrayBuffer());
  const extension = detectarImagen(buffer);
  if (!extension) return { error: "Formato no admitido: sube una imagen PNG, JPG o WebP" };
  return { buffer, extension };
}

export async function guardarArchivo(
  archivo: Buffer,
  subcarpeta: Subcarpeta,
  extension: ExtensionImagen
): Promise<string> {
  const carpeta = path.join(CARPETA_BASE, subcarpeta);
  await mkdir(carpeta, { recursive: true });

  const nombre = `${randomUUID()}.${extension}`;
  await writeFile(path.join(carpeta, nombre), archivo);

  return `/api/archivos/${subcarpeta}/${nombre}`;
}

const NOMBRE_VALIDO = /^[0-9a-f-]{36}\.(png|jpg|webp)$/;

/**
 * Lee un archivo guardado. Solo acepta una subcarpeta conocida y un nombre
 * con el formato que genera guardarArchivo (UUID + extensión), así que no
 * hay forma de salir de CARPETA_BASE con "../" (path traversal).
 */
export async function leerArchivo(
  subcarpeta: string,
  nombre: string
): Promise<{ contenido: Buffer; tipo: string } | null> {
  if (!(SUBCARPETAS as readonly string[]).includes(subcarpeta)) return null;
  if (!NOMBRE_VALIDO.test(nombre)) return null;
  const extension = nombre.split(".").pop() as ExtensionImagen;
  try {
    const contenido = await readFile(path.join(CARPETA_BASE, subcarpeta, nombre));
    return { contenido, tipo: TIPOS[extension] };
  } catch {
    return null;
  }
}
