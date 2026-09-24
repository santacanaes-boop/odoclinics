import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import { guardarArchivo, leerImagenSubida } from "@/lib/storage";

const TRATAMIENTOS = ["blanqueamiento", "carillas", "ortodoncia", "corona"] as const;
const TratamientoInput = z.enum(TRATAMIENTOS);

// Sección 4.3.8. La imagen "después" que llega aquí es una aproximación
// visual generada en el cliente (ajuste de brillo/saturación sobre la
// imagen original, ver src/components/SimulacionIA.tsx) — nunca
// generación real con un modelo de IA. Eso queda // TODO Fase 6.
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
  const tratamientoParsed = TratamientoInput.safeParse(form.get("tratamiento"));
  const tono = form.get("tono");
  const antes = form.get("antes");
  const despues = form.get("despues");

  if (!tratamientoParsed.success) {
    return NextResponse.json({ error: "Tratamiento no válido" }, { status: 400 });
  }
  const [imagenAntes, imagenDespues] = await Promise.all([
    leerImagenSubida(antes),
    leerImagenSubida(despues),
  ]);
  if ("error" in imagenAntes) {
    return NextResponse.json({ error: `Foto: ${imagenAntes.error}` }, { status: 400 });
  }
  if ("error" in imagenDespues) {
    return NextResponse.json(
      { error: `Imagen de aproximación: ${imagenDespues.error}` },
      { status: 400 }
    );
  }

  const [imagenAntesUrl, imagenDespuesUrl] = await Promise.all([
    guardarArchivo(imagenAntes.buffer, "simulaciones", imagenAntes.extension),
    guardarArchivo(imagenDespues.buffer, "simulaciones", imagenDespues.extension),
  ]);

  const simulacion = await prisma.simulacionIA.create({
    data: {
      pacienteId: params.id,
      tratamiento: tratamientoParsed.data,
      tono: typeof tono === "string" && tono ? tono : null,
      imagenAntesUrl,
      imagenDespuesUrl,
    },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "CREAR_SIMULACION_IA",
    entidad: "Paciente",
    entidadId: params.id,
    detalle: { simulacionId: simulacion.id, tratamiento: simulacion.tratamiento },
  });

  return NextResponse.json(simulacion, { status: 201 });
}
