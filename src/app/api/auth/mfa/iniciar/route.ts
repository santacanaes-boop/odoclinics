import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generarSecreto, generarCodigoQR } from "@/lib/mfa";
import { registrarAuditoria } from "@/lib/audit";

// Gestión de MFA de la propia cuenta — no es un módulo del RBAC (sección
// 4.11), es seguridad de la cuenta del usuario autenticado sobre sí mismo.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const usuarioId = session.user.id;

  // Si el MFA ya está activo, no se puede generar otro secreto desde aquí:
  // quien robase una sesión abierta podría sustituirlo por el suyo, dejar
  // fuera al titular y quedarse con el segundo factor. Para cambiarlo hay
  // que desactivarlo antes (lo que exige la contraseña).
  const actual = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { mfaEnabled: true },
  });
  if (actual?.mfaEnabled) {
    return NextResponse.json(
      { error: "La verificación en dos pasos ya está activa" },
      { status: 409 }
    );
  }

  const secreto = generarSecreto();

  // Se guarda ya (con mfaEnabled todavía en false) para que /confirmar pueda
  // verificar contra el mismo secreto aunque el usuario recargue la página.
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { mfaSecret: secreto },
  });

  const qr = await generarCodigoQR(secreto, session.user.email!);

  await registrarAuditoria({
    usuarioId,
    accion: "INICIAR_MFA",
    entidad: "Usuario",
    entidadId: usuarioId,
  });

  return NextResponse.json({ qr, secreto });
}
