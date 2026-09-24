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

  const permisos = session.user.permisos;
  const nivel = permisos?.[modulo] ?? "ninguno";

  const orden: Record<NivelPermiso, number> = { ninguno: 0, lectura: 1, total: 2 };
  const autorizado = orden[nivel] >= orden[nivelMinimo];

  return {
    autorizado,
    motivo: autorizado ? null : ("PERMISO_INSUFICIENTE" as const),
    session,
  };
}
