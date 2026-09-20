import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const LineaInput = z.object({
  concepto: z.string().min(1),
  importe: z.number().nonnegative(),
});
const PresupuestoInput = z.object({
  lineas: z.array(LineaInput).min(1),
});

// Sección 4.3.7: tabla de presupuestos con líneas y estado. La generación de
// PDF vive en /api/presupuestos/[id]/pdf.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = PresupuestoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const importeTotal = parsed.data.lineas.reduce((sum, l) => sum + l.importe, 0);

  const presupuesto = await prisma.presupuesto.create({
    data: {
      pacienteId: params.id,
      lineas: parsed.data.lineas,
      importeTotal,
      estado: "pendiente",
    },
  });

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "CREAR_PRESUPUESTO",
    entidad: "Paciente",
    entidadId: params.id,
    detalle: { presupuestoId: presupuesto.id, importeTotal },
  });

  return NextResponse.json(presupuesto, { status: 201 });
}
