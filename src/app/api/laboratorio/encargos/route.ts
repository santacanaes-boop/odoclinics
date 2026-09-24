import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const EncargoInput = z.object({
  pacienteId: z.string().min(1),
  laboratorioNombre: z.string().min(1),
  trabajo: z.string().min(1),
  coste: z.number().nonnegative(),
  fechaEntregaEstimada: z.coerce.date(),
});

// Sección 4.4: encargos externos a laboratorio protésico, vinculados al
// paciente. El "con retraso" no se persiste — se calcula en /laboratorio
// comparando fechaEntregaEstimada con la fecha actual.
export async function POST(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("laboratorio", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = EncargoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { laboratorioNombre, pacienteId, ...datos } = parsed.data;

  const encargo = await prisma.encargoLaboratorio.create({
    data: {
      ...datos,
      estado: "en_proceso",
      paciente: { connect: { id: pacienteId } },
      laboratorio: {
        connectOrCreate: {
          where: { nombre: laboratorioNombre },
          create: { nombre: laboratorioNombre },
        },
      },
    },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "CREAR_ENCARGO_LABORATORIO",
    entidad: "Paciente",
    entidadId: encargo.pacienteId,
    detalle: { encargoId: encargo.id, trabajo: encargo.trabajo },
  });

  return NextResponse.json(encargo, { status: 201 });
}
