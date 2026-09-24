"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FirmaCanvas from "./FirmaCanvas";

type Consentimiento = {
  id: string;
  tipo: string;
  estado: string;
  fechaFirma: string | Date | null;
  firmaImagenUrl: string | null;
};

// Checklist de consentimientos informados con firma digital táctil real
// (sección 4.3.6): se crea un consentimiento pendiente por tratamiento, y se
// firma in situ con el paciente delante en la tablet.
export default function Consentimientos({
  pacienteId,
  consentimientos,
}: {
  pacienteId: string;
  consentimientos: Consentimiento[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState("");
  const [creando, setCreando] = useState(false);
  const [firmandoId, setFirmandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    setError(null);

    const res = await fetch(`/api/pacientes/${pacienteId}/consentimientos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo }),
    });

    setCreando(false);

    if (!res.ok) {
      setError("No se ha podido crear el consentimiento.");
      return;
    }

    setTipo("");
    router.refresh();
  }

  async function handleFirmar(consentimientoId: string, firma: Blob) {
    const form = new FormData();
    form.append("firma", firma, "firma.png");

    const res = await fetch(`/api/consentimientos/${consentimientoId}/firmar`, {
      method: "PATCH",
      body: form,
    });

    if (res.ok) {
      setFirmandoId(null);
      router.refresh();
    } else {
      setError("No se ha podido guardar la firma.");
    }
  }

  return (
    <div>
      <form onSubmit={handleCrear} className="flex gap-3 mb-6">
        <input
          required
          placeholder="Tratamiento (ej. Extracción muela del juicio)"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="flex-1 rounded-lg border border-purple-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={creando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {creando ? "Creando…" : "Añadir consentimiento"}
        </button>
      </form>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {consentimientos.length === 0 ? (
        <p className="text-center py-6 text-purple-500">
          Todavía no hay consentimientos registrados.
        </p>
      ) : (
        <ul className="space-y-3">
          {consentimientos.map((c) => (
            <li key={c.id} className="rounded-xl border border-purple-100 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium">{c.tipo}</p>
                  {c.estado === "firmado" && c.fechaFirma ? (
                    <p className="text-xs text-purple-500">
                      Firmado el {new Date(c.fechaFirma).toLocaleDateString("es-ES")}
                    </p>
                  ) : (
                    <p className="text-xs text-purple-400">Pendiente de firma</p>
                  )}
                </div>

                {c.estado === "firmado" ? (
                  <span className="rounded-full bg-mint/20 text-purple-800 text-xs font-medium px-3 py-1">
                    ✓ Firmado
                  </span>
                ) : firmandoId === c.id ? (
                  <button
                    type="button"
                    onClick={() => setFirmandoId(null)}
                    className="text-xs text-purple-500"
                  >
                    Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFirmandoId(c.id)}
                    className="rounded-full bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1"
                  >
                    Firmar ahora
                  </button>
                )}
              </div>

              {c.estado === "firmado" && c.firmaImagenUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={c.firmaImagenUrl}
                  alt={`Firma de ${c.tipo}`}
                  className="mt-3 h-16 border border-purple-100 rounded-lg bg-white"
                />
              )}

              {firmandoId === c.id && (
                <div className="mt-4">
                  <p className="text-xs text-purple-500 mb-2">
                    Pásale la tablet al paciente para firmar aquí:
                  </p>
                  <FirmaCanvas onGuardar={(firma) => handleFirmar(c.id, firma)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
