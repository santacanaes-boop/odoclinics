import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import { PIEZAS_FDI, ESTADOS_PIEZA } from "@/lib/odontograma";

const PiezaInput = z.object({
  piezaFdi: z.number().int().refine((n) => (PIEZAS_FDI as readonly number[]).includes(n), {
    message: "Pieza FDI no válida",
  }),
  estado: z.enum(ESTADOS_PIEZA),
});

// Actualiza (o crea si no existía) el estado de una única pieza — sección
// 4.3.3: "editable con leyenda de colores". Se hace pieza a pieza para que
// cada cambio quede auditado por separado.
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PiezaInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pieza = await prisma.piezaOdontograma.upsert({
    where: {
      pacienteId_piezaFdi: { pacienteId: params.id, piezaFdi: parsed.data.piezaFdi },
    },
    update: { estado: parsed.data.estado },
    create: {
      pacienteId: params.id,
      piezaFdi: parsed.data.piezaFdi,
      estado: parsed.data.estado,
    },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "EDITAR_ODONTOGRAMA",
    entidad: "Paciente",
    entidadId: params.id,
    detalle: { piezaFdi: pieza.piezaFdi, estado: pieza.estado },
  });

  return NextResponse.json(pieza);
}
