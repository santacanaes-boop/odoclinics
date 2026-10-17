import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Almacenamiento local en disco, FUERA de public/: las radiografías, firmas
// y simulaciones son datos de salud (sección 7) y no pueden servirse como
// estáticos sin sesión. Se entregan solo a través de /api/archivos, que pasa
// por requierePermiso + registrarAuditoria como cualquier otra lectura de
// datos de paciente. (Además, Next.js en producción no sirve ficheros que se
// añaden a public/ después del build.)
//
// UPLOADS_DIR permite apuntar a una carpeta que sobreviva a los redespliegues
// (p.ej. en cPanel, fuera de la carpeta de la aplicación que se reemplaza).
//
// Para producción con pacientes reales (sección 4.3 y 7): esto debe
// sustituirse por almacenamiento S3-compatible con cifrado en reposo, tal
// como recomienda la sección 9 — sigue pendiente como TODO Fase 3.
const CARPETA_BASE = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "almacenamiento");

export const SUBCARPETAS = ["radiografias", "firmas", "simulaciones"] as const;
export type Subcarpeta = (typeof SUBCARPETAS)[number];

const TIPOS_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

// Solo nombres generados por guardarArchivo (uuid.ext): evita que una URL
// manipulada ("../..") lea cualquier otro fichero del servidor.
const NOMBRE_VALIDO = /^[0-9a-f-]{36}\.[a-z0-9]{1,5}$/;

export function urlArchivo(subcarpeta: Subcarpeta, nombre: string) {
  return `/api/archivos/${subcarpeta}/${nombre}`;
}

export async function guardarArchivo(
  archivo: Buffer,
  subcarpeta: Subcarpeta,
  extension: string
): Promise<string> {
  const carpeta = path.join(CARPETA_BASE, subcarpeta);
  await mkdir(carpeta, { recursive: true });

  const ext = extension.replace(/^\./, "").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const nombre = `${randomUUID()}.${ext}`;
  await writeFile(path.join(carpeta, nombre), archivo);

  return urlArchivo(subcarpeta, nombre);
}

export async function leerArchivo(
  subcarpeta: string,
  nombre: string
): Promise<{ contenido: Buffer; tipoMime: string } | null> {
  if (!(SUBCARPETAS as readonly string[]).includes(subcarpeta)) return null;
  if (!NOMBRE_VALIDO.test(nombre)) return null;

  try {
    const contenido = await readFile(path.join(CARPETA_BASE, subcarpeta, nombre));
    const ext = nombre.split(".").pop()!;
    return { contenido, tipoMime: TIPOS_MIME[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
