import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import { guardarArchivo, leerImagenSubida } from "@/lib/storage";

// Firma digital táctil real (sección 4.3.6): el canvas de dibujo del
// cliente envía el trazo como PNG, que se guarda como el justificante de
// firma del consentimiento in situ.
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const consentimiento = await prisma.consentimiento.findUnique({
    where: { id: params.id },
  });
  if (!consentimiento) {
    return NextResponse.json({ error: "Consentimiento no encontrado" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario no válido" }, { status: 400 });
  }
  const firma = form.get("firma");
  // La firma sale del canvas como PNG: cualquier otro formato no es una
  // firma hecha en la app.
  const imagen = await leerImagenSubida(firma);
  if ("error" in imagen || imagen.extension !== "png") {
    return NextResponse.json({ error: "Firma no válida" }, { status: 400 });
  }

  const firmaImagenUrl = await guardarArchivo(imagen.buffer, "firmas", "png");

  const actualizado = await prisma.consentimiento.update({
    where: { id: params.id },
    data: { estado: "firmado", fechaFirma: new Date(), firmaImagenUrl },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "FIRMAR_CONSENTIMIENTO",
    entidad: "Paciente",
    entidadId: consentimiento.pacienteId,
    detalle: { consentimientoId: actualizado.id, tipo: actualizado.tipo },
  });

  return NextResponse.json(actualizado);
}
