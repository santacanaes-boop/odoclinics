import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const PacienteInput = z.object({
  nombre: z.string().min(1),
  apellidos: z.string().min(1),
  dniNie: z.string().min(5),
  fechaNacimiento: z.coerce.date(),
  telefono: z.string().min(6),
  email: z.string().email().optional(),
  direccion: z.string().optional(),
  alertasMedicas: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("pacientes", "lectura");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();

  const pacientes = await prisma.paciente.findMany({
    where: q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { apellidos: { contains: q, mode: "insensitive" } },
            { dniNie: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      dniNie: true,
      telefono: true,
      alertasMedicas: true,
    },
    orderBy: { apellidos: "asc" },
  });

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "LISTAR_PACIENTES",
    entidad: "Paciente",
    entidadId: "*",
    detalle: q ? { q } : undefined,
  });

  return NextResponse.json(pacientes);
}

export async function POST(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = PacienteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const paciente = await prisma.paciente.create({ data: parsed.data });

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "CREAR_PACIENTE",
    entidad: "Paciente",
    entidadId: paciente.id,
  });

  return NextResponse.json(paciente, { status: 201 });
}
