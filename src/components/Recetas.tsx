"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Receta = {
  id: string;
  fecha: string | Date;
  medicamento: string;
  pauta: string;
  estado: string;
};

// Histórico de medicación prescrita (sección 4.3.4). La emisión de receta
// electrónica real requiere integrar el sistema del SNS/colegio
// profesional — queda marcada como pendiente de Fase 5 (sección 4.12).
export default function Recetas({
  pacienteId,
  recetas,
}: {
  pacienteId: string;
  recetas: Receta[];
}) {
  const router = useRouter();
  const [medicamento, setMedicamento] = useState("");
  const [pauta, setPauta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const res = await fetch(`/api/pacientes/${pacienteId}/recetas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medicamento, pauta }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido registrar la receta.");
      return;
    }

    setMedicamento("");
    setPauta("");
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 mb-6">
        <input
          required
          placeholder="Medicamento"
          value={medicamento}
          onChange={(e) => setMedicamento(e.target.value)}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Pauta (ej. 1 cada 8h, 5 días)"
          value={pauta}
          onChange={(e) => setPauta(e.target.value)}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Añadir receta"}
        </button>
      </form>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {recetas.length === 0 ? (
        <p className="text-center py-6 text-purple-500">
          Todavía no hay recetas registradas.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-purple-500">
            <tr>
              <th className="py-2">Fecha</th>
              <th className="py-2">Medicamento</th>
              <th className="py-2">Pauta</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {recetas.map((r) => (
              <tr key={r.id} className="border-t border-purple-100">
                <td className="py-2">{new Date(r.fecha).toLocaleDateString("es-ES")}</td>
                <td className="py-2 font-medium">{r.medicamento}</td>
                <td className="py-2">{r.pauta}</td>
                <td className="py-2 capitalize">{r.estado}</td>
                <td className="py-2">
                  <button
                    type="button"
                    disabled
                    title="Requiere integración con la receta electrónica del SNS/colegio profesional (Fase 5)"
                    className="text-xs text-purple-300 border border-purple-100 rounded-full px-3 py-1 cursor-not-allowed"
                  >
                    Emitir receta electrónica
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
