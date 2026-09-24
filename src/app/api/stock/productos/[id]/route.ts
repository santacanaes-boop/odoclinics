import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";

const StockInput = z.object({
  stockActual: z.number().int().nonnegative(),
});

// Ajuste manual del stock actual (recuento físico, mermas...).
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
  const parsed = StockInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const producto = await prisma.producto.update({
    where: { id: params.id },
    data: { stockActual: parsed.data.stockActual },
  });

  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "AJUSTAR_STOCK",
    entidad: "Producto",
    entidadId: producto.id,
    detalle: { stockActual: producto.stockActual },
  });

  return NextResponse.json(producto);
}
