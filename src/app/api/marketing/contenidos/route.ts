import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const ContenidoInput = z.object({
  titulo: z.string().min(1),
  canal: z.enum(["instagram", "facebook", "email", "blog"]),
  fecha: z.coerce.date(),
});

// Sección 4.8: calendario de contenidos (redes sociales, email).
export async function POST(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("marketing", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ContenidoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const contenido = await prisma.contenidoMarketing.create({
    data: { ...parsed.data, estado: "planificado" },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "CREAR_CONTENIDO_MARKETING",
    entidad: "ContenidoMarketing",
    entidadId: contenido.id,
    detalle: { titulo: contenido.titulo, canal: contenido.canal },
  });

  return NextResponse.json(contenido, { status: 201 });
}
