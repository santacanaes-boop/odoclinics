import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { autorizado, session } = await requierePermiso("pacientes", "lectura");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const paciente = await prisma.paciente.findUnique({
    where: { id: params.id },
    include: {
      anamnesis: true,
      historial: { orderBy: { fecha: "desc" } },
    },
  });

  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  // Auditoría de LECTURA, no solo de escritura — sección 7: "quién consulta,
  // no solo quién modifica".
  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "VER_FICHA_PACIENTE",
    entidad: "Paciente",
    entidadId: paciente.id,
  });

  return NextResponse.json(paciente);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();

  const paciente = await prisma.paciente.update({
    where: { id: params.id },
    data: body,
  });

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "EDITAR_PACIENTE",
    entidad: "Paciente",
    entidadId: paciente.id,
    detalle: { camposEditados: Object.keys(body) },
  });

  return NextResponse.json(paciente);
}
