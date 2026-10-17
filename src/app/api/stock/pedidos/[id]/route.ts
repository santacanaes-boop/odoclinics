import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const EstadoInput = z.object({
  estado: z.enum(["recibido", "cancelado"]),
});

// Al marcar un pedido como recibido, se suma la cantidad de cada línea al
// stockActual del producto correspondiente — sección 4.6: "generación de
// pedido... histórico de precios" se apoya en que el stock recibido sea real.
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { autorizado, session } = await requierePermiso("stock", "total");
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = EstadoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pedidoActual = await prisma.pedidoCompra.findUnique({ where: { id: params.id } });
  if (!pedidoActual) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  if (pedidoActual.estado !== "en_curso") {
    return NextResponse.json({ error: "El pedido ya no está en curso" }, { status: 409 });
  }

  const lineas = pedidoActual.lineas as {
    productoId: string;
    cantidad: number;
  }[];

  const pedido = await prisma.$transaction(async (tx) => {
    if (parsed.data.estado === "recibido") {
      for (const linea of lineas) {
        await tx.producto.update({
          where: { id: linea.productoId },
          data: { stockActual: { increment: linea.cantidad } },
        });
      }
    }
    return tx.pedidoCompra.update({
      where: { id: params.id },
      data: { estado: parsed.data.estado },
    });
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "EDITAR_PEDIDO_COMPRA",
    entidad: "PedidoCompra",
    entidadId: pedido.id,
    detalle: { estado: pedido.estado },
  });

  return NextResponse.json(pedido);
}
