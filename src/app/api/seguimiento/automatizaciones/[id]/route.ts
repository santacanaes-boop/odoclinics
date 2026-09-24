import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const ActivaInput = z.object({ activa: z.boolean() });

// El envío real por WhatsApp/email no está implementado (sección 4.9,
// requiere WhatsApp Business API + scheduler real — TODO Fase 6); esta
// ruta solo persiste si la regla está activada, para cuando exista esa
// integración.
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { autorizado, session } = await requierePermiso("seguimiento", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ActivaInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const automatizacion = await prisma.automatizacionMensaje.update({
    where: { id: params.id },
    data: { activa: parsed.data.activa },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "EDITAR_AUTOMATIZACION",
    entidad: "AutomatizacionMensaje",
    entidadId: automatizacion.id,
    detalle: { disparador: automatizacion.disparador, activa: automatizacion.activa },
  });

  return NextResponse.json(automatizacion);
}
