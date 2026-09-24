import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { demasiadosIntentos } from "@/lib/rateLimiter";

const PasswordInput = z.object({ password: z.string().min(1) });

// Requiere confirmar la contraseña para desactivar MFA — si no, un usuario
// que deja la sesión abierta en la tablet compartida podría bajar su propia
// seguridad sin darse cuenta.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PasswordInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta la contraseña" }, { status: 400 });
  }

  const usuarioId = session.user.id;

  // Evita probar contraseñas sin límite desde una sesión robada.
  if (demasiadosIntentos(`mfa-desactivar:${usuarioId}`)) {
    return NextResponse.json({ error: "Demasiados intentos, espera unos minutos" }, { status: 429 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });

  if (!usuario || !(await bcrypt.compare(parsed.data.password, usuario.passwordHash))) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { mfaEnabled: false, mfaSecret: null },
  });

  await registrarAuditoria({
    usuarioId,
    accion: "DESACTIVAR_MFA",
    entidad: "Usuario",
    entidadId: usuarioId,
  });

  return NextResponse.json({ desactivado: true });
}
