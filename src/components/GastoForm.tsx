"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIAS = ["Material clínico", "Suministros", "Laboratorio", "Nóminas", "Otros"];

export default function GastoForm() {
  const router = useRouter();
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [importe, setImporte] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const res = await fetch("/api/contabilidad/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto, categoria, importe: Number(importe) || 0 }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido registrar el gasto.");
      return;
    }

    setConcepto("");
    setImporte("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-3">
      <input
        required
        placeholder="Concepto"
        value={concepto}
        onChange={(e) => setConcepto(e.target.value)}
        className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
      />
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
      >
        {CATEGORIAS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        required
        type="number"
        min="0"
        step="0.01"
        placeholder="Importe €"
        value={importe}
        onChange={(e) => setImporte(e.target.value)}
        className="w-32 rounded-lg border border-purple-200 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Añadir gasto"}
      </button>
      {error && <p className="text-sm text-danger sm:col-span-4">{error}</p>}
    </form>
  );
}
