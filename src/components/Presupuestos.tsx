"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Linea = { concepto: string; importe: string };
type Presupuesto = {
  id: string;
  fecha: string | Date;
  lineas: unknown;
  importeTotal: unknown;
  estado: string;
};

const LINEA_VACIA: Linea = { concepto: "", importe: "" };

// Tabla de presupuestos con generación real de PDF (sección 4.3.7).
export default function Presupuestos({
  pacienteId,
  presupuestos,
}: {
  pacienteId: string;
  presupuestos: Presupuesto[];
}) {
  const router = useRouter();
  const [lineas, setLineas] = useState<Linea[]>([{ ...LINEA_VACIA }]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lineas.reduce((sum, l) => sum + (Number(l.importe) || 0), 0);

  function actualizarLinea(i: number, campo: keyof Linea, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const res = await fetch(`/api/pacientes/${pacienteId}/presupuestos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineas: lineas.map((l) => ({ concepto: l.concepto, importe: Number(l.importe) || 0 })),
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido crear el presupuesto.");
      return;
    }

    setLineas([{ ...LINEA_VACIA }]);
    router.refresh();
  }

  async function cambiarEstado(id: string, estado: "aceptado" | "rechazado") {
    const res = await fetch(`/api/presupuestos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-2 mb-3">
          {lineas.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input
                required
                placeholder="Concepto (ej. Blanqueamiento dental)"
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

        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setLineas((prev) => [...prev, { ...LINEA_VACIA }])}
            className="text-sm text-purple-700 font-medium"
          >
            + Añadir línea
          </button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-purple-700">
              Total: {total.toFixed(2)} €
            </span>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {enviando ? "Creando…" : "Crear presupuesto"}
            </button>
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {presupuestos.length === 0 ? (
        <p className="text-center py-6 text-purple-500">
          Todavía no hay presupuestos registrados.
        </p>
      ) : (
        <ul className="space-y-3">
          {presupuestos.map((p) => (
            <li key={p.id} className="rounded-xl border border-purple-100 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium font-mono">{Number(p.importeTotal).toFixed(2)} €</p>
                  <p className="text-xs text-purple-500">
                    {new Date(p.fecha).toLocaleDateString("es-ES")} ·{" "}
                    <span className="capitalize">{p.estado}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/presupuestos/${p.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1"
                  >
                    Descargar PDF
                  </a>
                  {p.estado === "pendiente" && (
                    <>
                      <button
                        type="button"
                        onClick={() => cambiarEstado(p.id, "aceptado")}
                        className="rounded-full bg-mint/20 text-purple-800 text-xs font-medium px-3 py-1"
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => cambiarEstado(p.id, "rechazado")}
                        className="rounded-full bg-danger/10 text-danger text-xs font-medium px-3 py-1"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
