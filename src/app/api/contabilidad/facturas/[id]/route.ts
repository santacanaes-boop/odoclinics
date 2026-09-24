import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const EstadoInput = z.object({
  estado: z.enum(["pagada", "pendiente", "anulada"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { autorizado, session } = await requierePermiso("contabilidad", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = EstadoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const factura = await prisma.factura.update({
    where: { id: params.id },
    data: { estado: parsed.data.estado },
  });

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "EDITAR_FACTURA",
    entidad: "Paciente",
    entidadId: factura.pacienteId,
    detalle: { facturaId: factura.id, estado: factura.estado },
  });

  return NextResponse.json(factura);
}
