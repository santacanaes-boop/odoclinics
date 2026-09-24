import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const CompletadoInput = z.object({ completado: z.boolean() });

// Atestación manual (sección 4.10.1/4.10.3) — quien marca un ítem confirma
// que ya lo ha hecho de verdad (p.ej. "backups cifrados configurados"),
// esto no lo comprueba automáticamente.
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { autorizado, session } = await requierePermiso("proteccion_datos", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CompletadoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const usuarioId = session!.user.id;

  const item = await prisma.checklistItem.update({
    where: { id: params.id },
    data: {
      completado: parsed.data.completado,
      actualizadoEn: new Date(),
      actualizadoPor: session!.user!.name ?? usuarioId,
    },
  });

  await registrarAuditoria({
    usuarioId,
    accion: "EDITAR_CHECKLIST_CUMPLIMIENTO",
    entidad: "ChecklistItem",
    entidadId: item.id,
    detalle: { texto: item.texto, completado: item.completado },
  });

  return NextResponse.json(item);
}
