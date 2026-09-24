import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const ConsentimientoInput = z.object({
  tipo: z.string().min(1),
});

// Crea un consentimiento pendiente de firma (sección 4.3.6). La firma en sí
// se hace en /api/consentimientos/[id]/firmar, con el canvas táctil.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ConsentimientoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const consentimiento = await prisma.consentimiento.create({
    data: {
      pacienteId: params.id,
      tipo: parsed.data.tipo,
      estado: "pendiente",
    },
  });

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "CREAR_CONSENTIMIENTO",
    entidad: "Paciente",
    entidadId: params.id,
    detalle: { consentimientoId: consentimiento.id, tipo: consentimiento.tipo },
  });

  return NextResponse.json(consentimiento, { status: 201 });
}
