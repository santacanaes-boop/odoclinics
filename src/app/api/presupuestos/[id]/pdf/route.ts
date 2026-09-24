import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import { generarPdfPresupuesto } from "@/lib/presupuestoPdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { autorizado, session } = await requierePermiso("pacientes", "lectura");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: params.id },
    include: { paciente: true },
  });
  if (!presupuesto) {
    return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  }

  const pdf = await generarPdfPresupuesto(presupuesto, presupuesto.paciente);

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "DESCARGAR_PDF_PRESUPUESTO",
    entidad: "Paciente",
    entidadId: presupuesto.pacienteId,
    detalle: { presupuestoId: presupuesto.id },
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presupuesto-${presupuesto.id}.pdf"`,
    },
  });
}
