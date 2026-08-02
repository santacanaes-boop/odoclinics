import { prisma } from "./prisma";

/**
 * Registra un acceso o modificación de datos sensibles.
 *
 * Sección 7: "Registro de auditoría de accesos a historiales (quién
 * consulta, no solo quién modifica) — obligatorio LOPD-GDD".
 *
 * Se llama tanto en lecturas (GET de una ficha de paciente) como en
 * escrituras (crear/editar/borrar), con acciones distintas.
 */
export async function registrarAuditoria(params: {
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  detalle?: Record<string, unknown>;
  ip?: string | null;
}) {
  await prisma.registroAuditoria.create({
    data: {
      usuarioId: params.usuarioId,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId,
      detalle: params.detalle ?? undefined,
      ip: params.ip ?? undefined,
    },
  });
}
