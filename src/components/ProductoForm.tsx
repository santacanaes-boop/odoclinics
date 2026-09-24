"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductoForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [stockActual, setStockActual] = useState("0");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const res = await fetch("/api/stock/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        categoria,
        stockActual: Number(stockActual) || 0,
        stockMinimo: Number(stockMinimo) || 0,
        proveedorNombre: proveedorNombre.trim() || undefined,
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido dar de alta el producto.");
      return;
    }

    setNombre("");
    setCategoria("");
    setStockActual("0");
    setStockMinimo("0");
    setProveedorNombre("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
      <input
        required
        placeholder="Nombre del producto"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="Categoría"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
      />
      <input
        required
        type="number"
        min="0"
        placeholder="Stock actual"
        value={stockActual}
        onChange={(e) => setStockActual(e.target.value)}
        className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
      />
      <input
        required
        type="number"
        min="0"
        placeholder="Stock mínimo"
        value={stockMinimo}
        onChange={(e) => setStockMinimo(e.target.value)}
        className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
      />
      <input
        placeholder="Proveedor (opcional)"
        value={proveedorNombre}
        onChange={(e) => setProveedorNombre(e.target.value)}
        className="rounded-lg border border-purple-200 px-3 py-2 text-sm sm:col-span-2"
      />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60 sm:col-span-2"
      >
        {enviando ? "Guardando…" : "Añadir producto"}
      </button>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
    </form>
  );
}
