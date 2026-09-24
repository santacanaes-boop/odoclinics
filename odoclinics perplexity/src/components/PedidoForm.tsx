"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LineaForm = { productoId: string; cantidad: string; precioUnitario: string };

export default function PedidoForm({
  productos,
  proveedores,
}: {
  productos: { id: string; nombre: string }[];
  proveedores: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([
    { productoId: productos[0]?.id ?? "", cantidad: "1", precioUnitario: "" },
  ]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si la lista de productos llega vacía en el primer render (o cambia)
  // después de que este formulario ya se montó — p.ej. se acaba de dar de
  // alta el primer producto en el bloque de arriba — el estado inicial de
  // React no se recalcula solo. Sin esto, una línea puede quedarse con
  // productoId vacío aunque el desplegable muestre un producto seleccionado.
  useEffect(() => {
    if (productos.length === 0) return;
    setLineas((prev) =>
      prev.map((l) =>
        productos.some((p) => p.id === l.productoId) ? l : { ...l, productoId: productos[0].id }
      )
    );
  }, [productos]);

  function actualizarLinea(i: number, campo: keyof LineaForm, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proveedorNombre.trim() || productos.length === 0) return;
    setEnviando(true);
    setError(null);

    const res = await fetch("/api/stock/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proveedorNombre: proveedorNombre.trim(),
        fechaEntregaEstimada: fechaEntregaEstimada || undefined,
        lineas: lineas.map((l) => ({
          productoId: l.productoId,
          nombre: productos.find((p) => p.id === l.productoId)?.nombre ?? "",
          cantidad: Number(l.cantidad) || 0,
          precioUnitario: Number(l.precioUnitario) || 0,
        })),
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido crear el pedido.");
      return;
    }

    setProveedorNombre("");
    setFechaEntregaEstimada("");
    setLineas([{ productoId: productos[0]?.id ?? "", cantidad: "1", precioUnitario: "" }]);
    router.refresh();
  }

  if (productos.length === 0) {
    return (
      <p className="text-sm text-purple-500">
        Da de alta algún producto antes de crear un pedido de compra.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div>
          <input
            required
            list="proveedores"
            placeholder="Proveedor"
            value={proveedorNombre}
            onChange={(e) => setProveedorNombre(e.target.value)}
            className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
          />
          <datalist id="proveedores">
            {proveedores.map((p) => (
              <option key={p.id} value={p.nombre} />
            ))}
          </datalist>
        </div>
        <input
          type="date"
          value={fechaEntregaEstimada}
          onChange={(e) => setFechaEntregaEstimada(e.target.value)}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2 mb-3">
        {lineas.map((l, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={l.productoId}
              onChange={(e) => actualizarLinea(i, "productoId", e.target.value)}
              className="flex-1 rounded-lg border border-purple-200 px-3 py-2 text-sm"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="1"
              placeholder="Cantidad"
              value={l.cantidad}
              onChange={(e) => actualizarLinea(i, "cantidad", e.target.value)}
              className="w-24 rounded-lg border border-purple-200 px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Precio ud."
              value={l.precioUnitario}
              onChange={(e) => actualizarLinea(i, "precioUnitario", e.target.value)}
              className="w-28 rounded-lg border border-purple-200 px-3 py-2 text-sm"
            />
            {lineas.length > 1 && (
              <button
                type="button"
                onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-purple-400 px-2"
                aria-label="Quitar línea"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setLineas((prev) => [
              ...prev,
              { productoId: productos[0]?.id ?? "", cantidad: "1", precioUnitario: "" },
            ])
          }
          className="text-sm text-purple-700 font-medium"
        >
          + Añadir línea
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {enviando ? "Creando…" : "Crear pedido"}
        </button>
      </div>

      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </form>
  );
}
