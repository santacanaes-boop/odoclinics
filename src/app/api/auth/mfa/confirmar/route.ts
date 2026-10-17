import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verificarCodigo } from "@/lib/mfa";
import { registrarAuditoria } from "@/lib/audit";

const CodigoInput = z.object({ codigo: z.string().length(6) });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CodigoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Código no válido" }, { status: 400 });
  }

  const usuarioId = session.user.id;
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });

  if (!usuario?.mfaSecret || !verificarCodigo(usuario.mfaSecret, parsed.data.codigo)) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { mfaEnabled: true },
  });

  await registrarAuditoria({
    usuarioId,
    accion: "ACTIVAR_MFA",
    entidad: "Usuario",
    entidadId: usuarioId,
  });

  return NextResponse.json({ activado: true });
}
