"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  proveedor: { nombre: string } | null;
};

// Inventario con nivel de stock y alerta de stock bajo (sección 4.6). El
// ajuste de stock (recuento físico, mermas) se guarda al vuelo por fila.
export default function ProductosTabla({ productos }: { productos: Producto[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(id: string) {
    setGuardando(true);
    const res = await fetch(`/api/stock/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockActual: Number(valor) || 0 }),
    });
    setGuardando(false);
    if (res.ok) {
      setEditando(null);
      router.refresh();
    }
  }

  if (productos.length === 0) {
    return (
      <p className="text-center py-6 text-purple-500">Todavía no hay productos en el inventario.</p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-purple-100 text-purple-700 text-left">
        <tr>
          <th className="px-4 py-3">Producto</th>
          <th className="px-4 py-3">Categoría</th>
          <th className="px-4 py-3">Proveedor</th>
          <th className="px-4 py-3 w-48">Stock</th>
          <th className="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {productos.map((p) => {
          const bajo = p.stockActual <= p.stockMinimo;
          const pct = p.stockMinimo > 0 ? Math.min(100, (p.stockActual / (p.stockMinimo * 2)) * 100) : 100;

          return (
            <tr key={p.id} className="border-t border-purple-100">
              <td className="px-4 py-3 font-medium">{p.nombre}</td>
              <td className="px-4 py-3">{p.categoria}</td>
              <td className="px-4 py-3">{p.proveedor?.nombre ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-purple-100 overflow-hidden">
                    <div
                      className={`h-full ${bajo ? "bg-danger" : "bg-mint"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`font-mono text-xs ${bajo ? "text-danger font-medium" : ""}`}>
                    {p.stockActual}/{p.stockMinimo}
                  </span>
                </div>
                {bajo && <p className="text-xs text-danger mt-1">⚠ Stock bajo mínimo</p>}
              </td>
              <td className="px-4 py-3 text-right">
                {editando === p.id ? (
                  <div className="flex items-center gap-1 justify-end">
                    <input
                      type="number"
                      min="0"
                      autoFocus
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      className="w-16 rounded border border-purple-200 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => guardar(p.id)}
                      className="text-xs text-purple-700 font-medium"
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(p.id);
                      setValor(String(p.stockActual));
                    }}
                    className="text-xs text-purple-500"
                  >
                    Ajustar
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
