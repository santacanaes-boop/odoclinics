import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import { leerArchivo } from "@/lib/storage";

// Entrega radiografías, firmas y simulaciones (src/lib/storage.ts). Son datos
// de paciente: mismo permiso que ver la ficha, y el acceso queda auditado
// contra el paciente al que pertenece el fichero (sección 7).
export async function GET(
  _req: NextRequest,
  { params }: { params: { subcarpeta: string; nombre: string } }
) {
  const { autorizado, session } = await requierePermiso("pacientes", "lectura");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { subcarpeta, nombre } = params;
  // Las URLs guardadas antes de este cambio apuntaban a /uploads/...
  const urls = [`/api/archivos/${subcarpeta}/${nombre}`, `/uploads/${subcarpeta}/${nombre}`];

  let pacienteId: string | null = null;
  if (subcarpeta === "radiografias") {
    const r = await prisma.radiografia.findFirst({ where: { archivoUrl: { in: urls } } });
    pacienteId = r?.pacienteId ?? null;
  } else if (subcarpeta === "firmas") {
    const c = await prisma.consentimiento.findFirst({ where: { firmaImagenUrl: { in: urls } } });
    pacienteId = c?.pacienteId ?? null;
  } else if (subcarpeta === "simulaciones") {
    const s = await prisma.simulacionIA.findFirst({
      where: { OR: [{ imagenAntesUrl: { in: urls } }, { imagenDespuesUrl: { in: urls } }] },
    });
    pacienteId = s?.pacienteId ?? null;
  }

  // Un fichero que no pertenece a ningún registro no se sirve.
  const archivo = pacienteId ? await leerArchivo(subcarpeta, nombre) : null;
  if (!pacienteId || !archivo) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "VER_ARCHIVO",
    entidad: "Paciente",
    entidadId: pacienteId,
    detalle: { subcarpeta, nombre },
  });

  return new NextResponse(new Uint8Array(archivo.contenido), {
    headers: {
      "Content-Type": archivo.tipoMime,
      // Datos de salud: que ni el navegador ni ningún proxy los guarden.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
