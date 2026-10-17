"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Ciclo = {
  id: string;
  equipo: string;
  fecha: string | Date;
  controlBiologico: string;
  notas: string | null;
};

const ESTADO_LABEL: Record<string, string> = {
  correcto: "Correcto",
  fallido: "Fallido",
  pendiente: "Pendiente de resultado",
};

export default function EsterilizacionForm({ ciclos }: { ciclos: Ciclo[] }) {
  const router = useRouter();
  const [equipo, setEquipo] = useState("");
  const [controlBiologico, setControlBiologico] = useState<"correcto" | "fallido" | "pendiente">(
    "pendiente"
  );
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const res = await fetch("/api/proteccion-datos/esterilizacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipo, controlBiologico, notas: notas || undefined }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido registrar el ciclo.");
      return;
    }

    setEquipo("");
    setNotas("");
    setControlBiologico("pendiente");
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            required
            placeholder="Equipo (ej. Autoclave 1)"
            value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
          />
          <select
            value={controlBiologico}
            onChange={(e) => setControlBiologico(e.target.value as typeof controlBiologico)}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
          >
            <option value="pendiente">Control biológico: pendiente</option>
            <option value="correcto">Control biológico: correcto</option>
            <option value="fallido">Control biológico: fallido</option>
          </select>
          <input
            placeholder="Notas (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="flex-1 min-w-[160px] rounded-lg border border-purple-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {enviando ? "Guardando…" : "Registrar ciclo"}
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      {ciclos.length === 0 ? (
        <p className="text-center py-6 text-purple-500">Todavía no hay ciclos registrados.</p>
      ) : (
        <ul className="space-y-2">
          {ciclos.map((c) => (
            <li key={c.id} className="rounded-lg border border-purple-100 p-3 text-sm flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-medium">{c.equipo}</span>{" "}
                <span className="text-purple-400 text-xs">
                  {new Date(c.fecha).toLocaleString("es-ES")}
                </span>
                {c.notas && <p className="text-xs text-purple-500">{c.notas}</p>}
              </div>
              <span
                className={`rounded-full text-xs font-medium px-3 py-1 ${
                  c.controlBiologico === "correcto"
                    ? "bg-mint/20 text-purple-800"
                    : c.controlBiologico === "fallido"
                    ? "bg-danger/10 text-danger"
                    : "bg-purple-50 text-purple-400"
                }`}
              >
                {ESTADO_LABEL[c.controlBiologico]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
