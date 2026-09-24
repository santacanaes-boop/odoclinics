import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const LineaInput = z.object({
  productoId: z.string().min(1),
  nombre: z.string().min(1),
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().nonnegative(),
});
const PedidoInput = z.object({
  proveedorNombre: z.string().min(1),
  lineas: z.array(LineaInput).min(1),
  fechaEntregaEstimada: z.coerce.date().optional(),
});

// Sección 4.6: pedidos a proveedores en curso.
export async function POST(req: NextRequest) {
  const { autorizado, session } = await requierePermiso("stock", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PedidoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pedido = await prisma.pedidoCompra.create({
    data: {
      lineas: parsed.data.lineas,
      estado: "en_curso",
      fechaEntregaEstimada: parsed.data.fechaEntregaEstimada,
      proveedor: {
        connectOrCreate: {
          where: { nombre: parsed.data.proveedorNombre },
          create: { nombre: parsed.data.proveedorNombre },
        },
      },
    },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "CREAR_PEDIDO_COMPRA",
    entidad: "PedidoCompra",
    entidadId: pedido.id,
    detalle: { proveedor: parsed.data.proveedorNombre },
  });

  return NextResponse.json(pedido, { status: 201 });
}
