import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const LineaInput = z.object({
  concepto: z.string().min(1),
  importe: z.number().nonnegative(),
});
const FacturaInput = z.object({
  pacienteId: z.string().min(1),
  lineas: z.array(LineaInput).min(1),
  estado: z.enum(["pagada", "pendiente"]),
});

// Sección 4.5: listado de facturas. Veri-Factu (registro inalterable con
// huella electrónica y envío a AEAT) no está implementado — requiere
// certificado digital y homologación del software. // TODO Fase 6
export async function POST(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("contabilidad", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = FacturaInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const importe = parsed.data.lineas.reduce((sum, l) => sum + l.importe, 0);

  const factura = await prisma.factura.create({
    data: {
      pacienteId: parsed.data.pacienteId,
      lineas: parsed.data.lineas,
      importe,
      estado: parsed.data.estado,
    },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "CREAR_FACTURA",
    entidad: "Paciente",
    entidadId: factura.pacienteId,
    detalle: { facturaId: factura.id, importe },
  });

  return NextResponse.json(factura, { status: 201 });
}
