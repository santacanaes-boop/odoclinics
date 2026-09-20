import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const ProductoInput = z.object({
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  stockActual: z.number().int().nonnegative(),
  stockMinimo: z.number().int().nonnegative(),
  proveedorNombre: z.string().min(1).optional(),
});

// Sección 4.6: inventario con nivel de stock y alerta de stock bajo
// (stockActual <= stockMinimo, calculado en la UI, nunca hardcoded).
export async function POST(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("stock", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ProductoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { proveedorNombre, ...datosProducto } = parsed.data;

  const producto = await prisma.producto.create({
    data: {
      ...datosProducto,
      proveedor: proveedorNombre
        ? {
            connectOrCreate: {
              where: { nombre: proveedorNombre },
              create: { nombre: proveedorNombre },
            },
          }
        : undefined,
    },
  });

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "CREAR_PRODUCTO",
    entidad: "Producto",
    entidadId: producto.id,
    detalle: { nombre: producto.nombre },
  });

  return NextResponse.json(producto, { status: 201 });
}
