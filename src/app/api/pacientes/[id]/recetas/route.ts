import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const RecetaInput = z.object({
  medicamento: z.string().min(1),
  pauta: z.string().min(1),
});

// La emisión de receta electrónica real (envío al sistema del SNS/colegio
// profesional) queda para Fase 5 (sección 4.3.4) — aquí solo se registra la
// receta como "emitida" en la ficha del paciente.
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RecetaInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const usuarioId = session!.user.id;

  const receta = await prisma.receta.create({
    data: {
      pacienteId: params.id,
      medicamento: parsed.data.medicamento,
      pauta: parsed.data.pauta,
      prescriptorId: usuarioId,
      estado: "emitida",
    },
  });

  await registrarAuditoria({
    usuarioId,
    accion: "CREAR_RECETA",
    entidad: "Paciente",
    entidadId: params.id,
    detalle: { recetaId: receta.id, medicamento: receta.medicamento },
  });

  return NextResponse.json(receta, { status: 201 });
}
