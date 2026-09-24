import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const GastoInput = z.object({
  concepto: z.string().min(1),
  categoria: z.string().min(1),
  importe: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("contabilidad", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = GastoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const gasto = await prisma.gasto.create({ data: parsed.data });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "CREAR_GASTO",
    entidad: "Gasto",
    entidadId: gasto.id,
    detalle: { concepto: gasto.concepto, importe: parsed.data.importe },
  });

  return NextResponse.json(gasto, { status: 201 });
}
