import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import { guardarArchivo } from "@/lib/storage";

const TRATAMIENTOS = ["blanqueamiento", "carillas", "ortodoncia", "corona"] as const;
const TratamientoInput = z.enum(TRATAMIENTOS);

// Sección 4.3.8. La imagen "después" que llega aquí es una aproximación
// visual generada en el cliente (ajuste de brillo/saturación sobre la
// imagen original, ver src/components/SimulacionIA.tsx) — nunca
// generación real con un modelo de IA. Eso queda // TODO Fase 6.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const form = await req.formData();
  const tratamientoParsed = TratamientoInput.safeParse(form.get("tratamiento"));
  const tono = form.get("tono");
  const antes = form.get("antes");
  const despues = form.get("despues");

  if (!tratamientoParsed.success) {
    return NextResponse.json({ error: "Tratamiento no válido" }, { status: 400 });
  }
  if (!(antes instanceof File) || !antes.type.startsWith("image/")) {
    return NextResponse.json({ error: "Sube una foto válida" }, { status: 400 });
  }
  if (!(despues instanceof File) || !despues.type.startsWith("image/")) {
    return NextResponse.json({ error: "Falta la imagen de aproximación" }, { status: 400 });
  }

  const [bufferAntes, bufferDespues] = await Promise.all([
    antes.arrayBuffer().then(Buffer.from),
    despues.arrayBuffer().then(Buffer.from),
  ]);

  const [imagenAntesUrl, imagenDespuesUrl] = await Promise.all([
    guardarArchivo(bufferAntes, "simulaciones", antes.type.split("/")[1] ?? "jpg"),
    guardarArchivo(bufferDespues, "simulaciones", "jpg"),
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
    usuarioId: (session!.user as any).id,
    accion: "CREAR_SIMULACION_IA",
    entidad: "Paciente",
    entidadId: params.id,
    detalle: { simulacionId: simulacion.id, tratamiento: simulacion.tratamiento },
  });

  return NextResponse.json(simulacion, { status: 201 });
}
