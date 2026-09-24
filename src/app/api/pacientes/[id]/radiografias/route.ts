import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import { guardarArchivo, leerImagenSubida } from "@/lib/storage";

const TIPOS_RADIOGRAFIA = ["panoramica", "periapical", "bite-wing"] as const;
const TipoInput = z.enum(TIPOS_RADIOGRAFIA);

// Subida manual de radiografías (sección 4.3.5). La recepción automática
// desde el sensor de rayos X conectado queda para Fase 5 (sección 4.12) —
// por eso dispositivoOrigen se fija siempre a "manual" aquí.
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario no válido" }, { status: 400 });
  }
  const tipoParsed = TipoInput.safeParse(form.get("tipo"));
  const archivo = form.get("archivo");

  if (!tipoParsed.success) {
    return NextResponse.json({ error: "Tipo de radiografía no válido" }, { status: 400 });
  }
  const imagen = await leerImagenSubida(archivo);
  if ("error" in imagen) {
    return NextResponse.json({ error: imagen.error }, { status: 400 });
  }

  const archivoUrl = await guardarArchivo(imagen.buffer, "radiografias", imagen.extension);

  const radiografia = await prisma.radiografia.create({
    data: {
      pacienteId: params.id,
      tipo: tipoParsed.data,
      archivoUrl,
      dispositivoOrigen: "manual",
    },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "SUBIR_RADIOGRAFIA",
    entidad: "Paciente",
    entidadId: params.id,
    detalle: { radiografiaId: radiografia.id, tipo: radiografia.tipo },
  });

  return NextResponse.json(radiografia, { status: 201 });
}
