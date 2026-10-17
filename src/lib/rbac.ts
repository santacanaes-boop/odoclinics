import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type Modulo =
  | "inicio"
  | "agenda"
  | "pacientes"
  | "laboratorio"
  | "contabilidad"
  | "stock"
  | "informes"
  | "marketing"
  | "seguimiento"
  | "proteccion_datos"
  | "roles"
  | "integraciones";

export type NivelPermiso = "ninguno" | "lectura" | "total";

/**
 * Comprueba el permiso de la sesión actual contra un módulo, en el SERVIDOR.
 *
 * Sección 4.11 de la especificación: "los permisos deben aplicarse en el
 * backend (autorización a nivel de API), nunca solo ocultando elementos en
 * el frontend — un permiso ocultado visualmente pero no bloqueado en el
 * servidor no es seguridad real."
 *
 * Toda ruta de API que toque datos de pacientes debe llamar a esto antes de
 * leer o escribir nada.
 */
export async function requierePermiso(
  modulo: Modulo,
  nivelMinimo: NivelPermiso = "lectura"
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { autorizado: false as const, motivo: "NO_AUTENTICADO" as const, session: null };
  }

  // MFA obligatorio (sección 7): sin segundo factor configurado no se
  // accede a ningún módulo, tenga el rol los permisos que tenga.
  if (!session.user.mfaEnabled) {
    return { autorizado: false as const, motivo: "MFA_PENDIENTE" as const, session };
  }

  const autorizado = tieneAcceso(session.user.permisos, modulo, nivelMinimo);

  return {
    autorizado,
    motivo: autorizado ? null : ("PERMISO_INSUFICIENTE" as const),
    session,
  };
}

const ORDEN_NIVEL: Record<NivelPermiso, number> = { ninguno: 0, lectura: 1, total: 2 };

/**
 * ¿Alcanzan estos permisos el nivel pedido en el módulo? Para decidir qué
 * bloques mostrar dentro de una página ya autorizada (p.ej. Inicio solo
 * enseña el stock bajo a quien tiene acceso a Stock). Un nivel desconocido
 * en la BD cuenta como "ninguno" (falla cerrado).
 */
export function tieneAcceso(
  permisos: Partial<Record<Modulo, NivelPermiso>> | undefined,
  modulo: Modulo,
  nivelMinimo: NivelPermiso = "lectura"
): boolean {
  const nivel = permisos?.[modulo] ?? "ninguno";
  return (ORDEN_NIVEL[nivel] ?? 0) >= ORDEN_NIVEL[nivelMinimo];
}
