"use client";

import { useRouter } from "next/navigation";

type LineaPedido = { nombre: string; cantidad: number; precioUnitario: number };
type Pedido = {
  id: string;
  estado: string;
  fechaPedido: string | Date;
  fechaEntregaEstimada: string | Date | null;
  lineas: unknown;
  proveedor: { nombre: string };
};

export default function PedidosLista({ pedidos }: { pedidos: Pedido[] }) {
  const router = useRouter();

  async function cambiarEstado(id: string, estado: "recibido" | "cancelado") {
    const res = await fetch(`/api/stock/pedidos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) router.refresh();
  }

  if (pedidos.length === 0) {
    return <p className="text-center py-6 text-purple-500">Todavía no hay pedidos de compra.</p>;
  }

  return (
    <ul className="space-y-3">
      {pedidos.map((p) => {
        const lineas = (p.lineas as LineaPedido[]) ?? [];
        return (
          <li key={p.id} className="rounded-xl border border-purple-100 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div>
                <p className="font-medium">{p.proveedor.nombre}</p>
                <p className="text-xs text-purple-500">
                  Pedido el {new Date(p.fechaPedido).toLocaleDateString("es-ES")}
                  {p.fechaEntregaEstimada &&
                    ` · entrega estimada ${new Date(p.fechaEntregaEstimada).toLocaleDateString("es-ES")}`}
                </p>
              </div>

              {p.estado === "en_curso" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cambiarEstado(p.id, "recibido")}
                    className="rounded-full bg-mint/20 text-purple-800 text-xs font-medium px-3 py-1"
                  >
                    Marcar recibido
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarEstado(p.id, "cancelado")}
                    className="rounded-full bg-danger/10 text-danger text-xs font-medium px-3 py-1"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <span
                  className={`rounded-full text-xs font-medium px-3 py-1 capitalize ${
                    p.estado === "recibido"
                      ? "bg-mint/20 text-purple-800"
                      : "bg-purple-50 text-purple-400"
                  }`}
                >
                  {p.estado}
                </span>
              )}
            </div>

            <ul className="text-xs text-purple-600 space-y-0.5">
              {lineas.map((l, i) => (
                <li key={i}>
                  {l.cantidad}× {l.nombre} — {Number(l.precioUnitario).toFixed(2)} € /ud.
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
