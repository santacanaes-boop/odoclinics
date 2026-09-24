import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Almacenamiento local bajo public/uploads — suficiente para que la subida
// de radiografías y firmas sea funcional de principio a fin en esta fase.
//
// Para producción (sección 4.3 y 7): esto debe sustituirse por almacenamiento
// S3-compatible con cifrado en reposo, tal como recomienda la sección 9. No
// se implementa aquí para no ocultar la lógica de negocio del scaffold bajo
// una capa de infraestructura — queda marcado como TODO Fase 3.
const CARPETA_BASE = path.join(process.cwd(), "public", "uploads");

export async function guardarArchivo(
  archivo: Buffer,
  subcarpeta: string,
  extension: string
): Promise<string> {
  const carpeta = path.join(CARPETA_BASE, subcarpeta);
  await mkdir(carpeta, { recursive: true });

  const nombre = `${randomUUID()}.${extension.replace(/^\./, "")}`;
  await writeFile(path.join(carpeta, nombre), archivo);

  return `/uploads/${subcarpeta}/${nombre}`;
}
