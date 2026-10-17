"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Radiografia = {
  id: string;
  tipo: string;
  fecha: string | Date;
  archivoUrl: string;
  dispositivoOrigen: string | null;
};

const TIPOS = [
  { value: "panoramica", label: "Panorámica" },
  { value: "periapical", label: "Periapical" },
  { value: "bite-wing", label: "Bite-wing" },
];

// Galería con subida manual (sección 4.3.5). La recepción automática desde
// el sensor de rayos X conectado queda para Fase 5 (sección 4.12).
export default function Radiografias({
  pacienteId,
  radiografias,
}: {
  pacienteId: string;
  radiografias: Radiografia[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState(TIPOS[0].value);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const archivo = inputRef.current?.files?.[0];
    if (!archivo) return;

    setSubiendo(true);
    setError(null);

    const form = new FormData();
    form.append("tipo", tipo);
    form.append("archivo", archivo);

    const res = await fetch(`/api/pacientes/${pacienteId}/radiografias`, {
      method: "POST",
      body: form,
    });

    setSubiendo(false);

    if (!res.ok) {
      setError("No se ha podido subir la imagen.");
      return;
    }

    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-purple-500 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-purple-500 mb-1">Imagen</label>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={subiendo}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {subiendo ? "Subiendo…" : "Subir radiografía"}
        </button>
      </form>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {radiografias.length === 0 ? (
        <p className="text-center py-6 text-purple-500">
          Todavía no hay radiografías registradas.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {radiografias.map((r) => (
            <a
              key={r.id}
              href={r.archivoUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-purple-100 overflow-hidden bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.archivoUrl} alt={r.tipo} className="w-full h-28 object-cover" />
              <div className="p-2">
                <p className="text-xs font-medium">
                  {TIPOS.find((t) => t.value === r.tipo)?.label ?? r.tipo}
                </p>
                <p className="text-xs text-purple-400">
                  {new Date(r.fecha).toLocaleDateString("es-ES")}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
