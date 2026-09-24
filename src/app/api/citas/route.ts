import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const CitaInput = z.object({
  pacienteId: z.string(),
  gabinete: z.union([z.literal(1), z.literal(2)]),
  fechaHora: z.coerce.date(),
  duracionMin: z.number().int().positive(),
  tratamiento: z.string().min(1),
  profesionalId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("agenda", "lectura");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const fechaParam = req.nextUrl.searchParams.get("fecha"); // YYYY-MM-DD
  const fecha = fechaParam ? new Date(fechaParam) : new Date();
  if (Number.isNaN(fecha.getTime())) {
    return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
  }
  const inicioDia = new Date(fecha.setHours(0, 0, 0, 0));
  const finDia = new Date(fecha.setHours(23, 59, 59, 999));

  const citas = await prisma.cita.findMany({
    where: { fechaHora: { gte: inicioDia, lte: finDia } },
    include: { paciente: { select: { nombre: true, apellidos: true } } },
    orderBy: { fechaHora: "asc" },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "VER_AGENDA",
    entidad: "Cita",
    entidadId: "*",
    detalle: { fecha: fechaParam },
  });

  return NextResponse.json(citas);
}

export async function POST(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("agenda", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CitaInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { gabinete, fechaHora, duracionMin } = parsed.data;
  const finNueva = new Date(fechaHora.getTime() + duracionMin * 60_000);

  // Validación de solapes por gabinete (sección 4.2: "Crear/editar/cancelar
  // cita, con validación de solapes por gabinete").
  const citasDelGabinete = await prisma.cita.findMany({
    where: {
      gabinete,
      estado: { not: "cancelada" },
      // Traemos las citas del mismo día para comparar en memoria: más simple
      // y legible que una condición de solape en SQL puro con Prisma.
      fechaHora: {
        gte: new Date(fechaHora.getFullYear(), fechaHora.getMonth(), fechaHora.getDate()),
        lt: new Date(fechaHora.getFullYear(), fechaHora.getMonth(), fechaHora.getDate() + 1),
      },
    },
  });

  const haySolape = citasDelGabinete.some((c) => {
    const finExistente = new Date(c.fechaHora.getTime() + c.duracionMin * 60_000);
    return fechaHora < finExistente && finNueva > c.fechaHora;
  });

  if (haySolape) {
    return NextResponse.json(
      { error: "El gabinete ya tiene una cita en ese horario." },
      { status: 409 }
    );
  }

  const cita = await prisma.cita.create({
    data: { ...parsed.data, estado: "pendiente_confirmacion" },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "CREAR_CITA",
    entidad: "Cita",
    entidadId: cita.id,
  });

  // TODO Fase 4: disparar aquí la automatización de recordatorio (sección 4.9)
  // vía WhatsApp Business API / email cuando esas integraciones existan.

  return NextResponse.json(cita, { status: 201 });
}
