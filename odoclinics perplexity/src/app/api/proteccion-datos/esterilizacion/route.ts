import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const CicloInput = z.object({
  equipo: z.string().min(1),
  controlBiologico: z.enum(["correcto", "fallido", "pendiente"]),
  notas: z.string().optional(),
});

// Sección 4.10.2: trazabilidad de autoclaves y controles biológicos de
// esporas — exigido por normativa sanitaria.
export async function POST(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("proteccion_datos", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CicloInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ciclo = await prisma.cicloEsterilizacion.create({ data: parsed.data });

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "REGISTRAR_CICLO_ESTERILIZACION",
    entidad: "CicloEsterilizacion",
    entidadId: ciclo.id,
    detalle: { equipo: ciclo.equipo, controlBiologico: ciclo.controlBiologico },
  });

  return NextResponse.json(ciclo, { status: 201 });
}
