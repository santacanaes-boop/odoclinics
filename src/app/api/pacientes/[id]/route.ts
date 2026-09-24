import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

// Solo estos campos se pueden editar. `.strict()` rechaza cualquier otro:
// antes se pasaba el body tal cual a Prisma, lo que permitía escrituras
// anidadas (borrar citas, crear facturas, o guardar la anamnesis SIN
// cifrar, porque la extensión de cifrado no ve las escrituras anidadas).
const PacienteEdicion = z
  .object({
    nombre: z.string().min(1),
    apellidos: z.string().min(1),
    dniNie: z.string().min(5),
    fechaNacimiento: z.coerce.date(),
    telefono: z.string().min(6),
    email: z.string().email().nullable(),
    direccion: z.string().nullable(),
    alertasMedicas: z.array(z.string()),
    origen: z.string().nullable(),
  })
  .partial()
  .strict();

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { autorizado, session } = await requierePermiso("pacientes", "lectura");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const paciente = await prisma.paciente.findUnique({
    where: { id: params.id },
    include: {
      anamnesis: true,
      historial: { orderBy: { fecha: "desc" } },
    },
  });

  if (!paciente) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  // Auditoría de LECTURA, no solo de escritura — sección 7: "quién consulta,
  // no solo quién modifica".
  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "VER_FICHA_PACIENTE",
    entidad: "Paciente",
    entidadId: paciente.id,
  });

  return NextResponse.json(paciente);
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { autorizado, session } = await requierePermiso("pacientes", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = PacienteEdicion.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existe = await prisma.paciente.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existe) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const paciente = await prisma.paciente.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "EDITAR_PACIENTE",
    entidad: "Paciente",
    entidadId: paciente.id,
    detalle: { camposEditados: Object.keys(parsed.data) },
  });

  return NextResponse.json(paciente);
}
