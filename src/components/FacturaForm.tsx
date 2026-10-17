"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Linea = { concepto: string; importe: string };
const LINEA_VACIA: Linea = { concepto: "", importe: "" };

export default function FacturaForm({
  pacientes,
}: {
  pacientes: { id: string; nombre: string; apellidos: string }[];
}) {
  const router = useRouter();
  const [pacienteId, setPacienteId] = useState(pacientes[0]?.id ?? "");
  const [estado, setEstado] = useState<"pagada" | "pendiente">("pendiente");
  const [lineas, setLineas] = useState<Linea[]>([{ ...LINEA_VACIA }]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizarLinea(i: number, campo: keyof Linea, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId) return;
    setEnviando(true);
    setError(null);

    const res = await fetch("/api/contabilidad/facturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pacienteId,
        estado,
        lineas: lineas.map((l) => ({ concepto: l.concepto, importe: Number(l.importe) || 0 })),
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido crear la factura.");
      return;
    }

    setLineas([{ ...LINEA_VACIA }]);
    router.refresh();
  }

  if (pacientes.length === 0) {
    return (
      <p className="text-sm text-purple-500">
        Da de alta algún paciente antes de emitir facturas.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <select
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        >
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.apellidos}, {p.nombre}
            </option>
          ))}
        </select>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as "pagada" | "pendiente")}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        >
          <option value="pendiente">Pendiente de cobro</option>
          <option value="pagada">Pagada</option>
        </select>
      </div>

      <div className="space-y-2 mb-3">
        {lineas.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input
              required
              placeholder="Concepto"
              value={l.concepto}
              onChange={(e) => actualizarLinea(i, "concepto", e.target.value)}
              className="flex-1 rounded-lg border border-purple-200 px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Importe €"
              value={l.importe}
              onChange={(e) => actualizarLinea(i, "importe", e.target.value)}
              className="w-32 rounded-lg border border-purple-200 px-3 py-2 text-sm"
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
          onClick={() => setLineas((prev) => [...prev, { ...LINEA_VACIA }])}
          className="text-sm text-purple-700 font-medium"
        >
          + Añadir línea
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {enviando ? "Creando…" : "Crear factura"}
        </button>
      </div>

      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </form>
  );
}
