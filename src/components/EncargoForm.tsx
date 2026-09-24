"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EncargoForm({
  pacientes,
  laboratorios,
}: {
  pacientes: { id: string; nombre: string; apellidos: string }[];
  laboratorios: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pacienteId, setPacienteId] = useState(pacientes[0]?.id ?? "");
  const [laboratorioNombre, setLaboratorioNombre] = useState("");
  const [trabajo, setTrabajo] = useState("");
  const [coste, setCoste] = useState("");
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId || !laboratorioNombre.trim()) return;
    setEnviando(true);
    setError(null);

    const res = await fetch("/api/laboratorio/encargos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pacienteId,
        laboratorioNombre: laboratorioNombre.trim(),
        trabajo,
        coste: Number(coste) || 0,
        fechaEntregaEstimada,
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido crear el encargo.");
      return;
    }

    setLaboratorioNombre("");
    setTrabajo("");
    setCoste("");
    setFechaEntregaEstimada("");
    router.refresh();
  }

  if (pacientes.length === 0) {
    return (
      <p className="text-sm text-purple-500">
        Da de alta algún paciente antes de crear un encargo de laboratorio.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-3">
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
        <input
          required
          list="laboratorios"
          placeholder="Laboratorio"
          value={laboratorioNombre}
          onChange={(e) => setLaboratorioNombre(e.target.value)}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        />
        <datalist id="laboratorios">
          {laboratorios.map((l) => (
            <option key={l.id} value={l.nombre} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          required
          placeholder="Trabajo (ej. Corona pieza 16)"
          value={trabajo}
          onChange={(e) => setTrabajo(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-purple-200 px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Coste €"
          value={coste}
          onChange={(e) => setCoste(e.target.value)}
          className="w-28 rounded-lg border border-purple-200 px-3 py-2 text-sm"
        />
        <input
          required
          type="date"
          value={fechaEntregaEstimada}
          onChange={(e) => setFechaEntregaEstimada(e.target.value)}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {enviando ? "Creando…" : "Crear encargo"}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
