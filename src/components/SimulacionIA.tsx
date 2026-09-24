"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Simulacion = {
  id: string;
  tratamiento: string;
  tono: string | null;
  imagenAntesUrl: string;
  imagenDespuesUrl: string;
  createdAt: string | Date;
};

const TRATAMIENTOS = [
  { value: "blanqueamiento", label: "Blanqueamiento" },
  { value: "carillas", label: "Carillas" },
  { value: "ortodoncia", label: "Ortodoncia" },
  { value: "corona", label: "Corona" },
];

// Tonos VITA con un factor de brillo ilustrativo — no es una tabla
// colorimétrica real, solo sirve para que la aproximación visual se note
// más o menos según el tono elegido.
const TONOS_VITA = [
  { value: "B1", label: "B1 (más claro)", brillo: 1.22 },
  { value: "A1", label: "A1", brillo: 1.18 },
  { value: "B2", label: "B2", brillo: 1.14 },
  { value: "A2", label: "A2 (natural)", brillo: 1.08 },
  { value: "A3", label: "A3", brillo: 1.02 },
  { value: "C2", label: "C2 (más oscuro)", brillo: 0.96 },
];

// Sección 4.3.8. IMPORTANTE: el "después" que genera este componente es
// una aproximación visual (ajuste de brillo/saturación en canvas), el
// mismo enfoque que ya usaba el prototipo HTML original — se etiqueta así
// en toda la UI y nunca se presenta como generación real con IA. Conectar
// un modelo real de imagen (Google Imagen, DALL·E, Stability AI) queda
// // TODO Fase 6 — requiere una API key gestionada en servidor.
export default function SimulacionIA({
  pacienteId,
  simulaciones,
}: {
  pacienteId: string;
  simulaciones: Simulacion[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tratamiento, setTratamiento] = useState(TRATAMIENTOS[0].value);
  const [tono, setTono] = useState(TONOS_VITA[0].value);
  const [previewAntes, setPreviewAntes] = useState<string | null>(null);
  const [previewDespues, setPreviewDespues] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soportado = tratamiento === "blanqueamiento";

  function generarAproximacion() {
    const archivo = inputRef.current?.files?.[0];
    const canvas = canvasRef.current;
    if (!archivo || !canvas) return;

    const brillo = TONOS_VITA.find((t) => t.value === tono)?.brillo ?? 1;
    const img = new Image();
    img.onload = () => {
      const maxLado = 800;
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      canvas.width = img.width * escala;
      canvas.height = img.height * escala;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = `brightness(${brillo}) saturate(0.9)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setPreviewDespues(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = URL.createObjectURL(archivo);
    setPreviewAntes(URL.createObjectURL(archivo));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    const archivo = inputRef.current?.files?.[0];
    if (!canvas || !archivo || !previewDespues) return;

    setEnviando(true);
    setError(null);

    canvas.toBlob(async (blobDespues) => {
      if (!blobDespues) {
        setEnviando(false);
        setError("No se ha podido generar la aproximación.");
        return;
      }

      const form = new FormData();
      form.append("tratamiento", tratamiento);
      form.append("tono", tono);
      form.append("antes", archivo);
      form.append("despues", blobDespues, "despues.jpg");

      const res = await fetch(`/api/pacientes/${pacienteId}/simulaciones`, {
        method: "POST",
        body: form,
      });

      setEnviando(false);

      if (!res.ok) {
        setError("No se ha podido guardar la simulación.");
        return;
      }

      if (inputRef.current) inputRef.current.value = "";
      setPreviewAntes(null);
      setPreviewDespues(null);
      router.refresh();
    }, "image/jpeg", 0.85);
  }

  return (
    <div>
      <div className="mb-4 rounded-lg bg-purple-50 border border-purple-100 px-4 py-3 text-xs text-purple-600">
        El “después” es una <strong>aproximación visual</strong> (ajuste de brillo/saturación
        de la foto), no una generación real con IA. Conectar un modelo de imagen real
        (Fase 6) requiere elegir proveedor y gestionar su API key en servidor.
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={tratamiento}
            onChange={(e) => {
              setTratamiento(e.target.value);
              setPreviewAntes(null);
              setPreviewDespues(null);
            }}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
          >
            {TRATAMIENTOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {tratamiento === "blanqueamiento" && (
            <select
              value={tono}
              onChange={(e) => setTono(e.target.value)}
              className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
            >
              {TONOS_VITA.map((t) => (
                <option key={t.value} value={t.value}>
                  Tono VITA {t.label}
                </option>
              ))}
            </select>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={!soportado}
            onChange={generarAproximacion}
            className="text-sm"
          />
        </div>

        {!soportado && (
          <p className="text-xs text-purple-500">
            Este tratamiento todavía no tiene una aproximación visual disponible — sin ajuste de
            brillo/saturación no hay forma honesta de simularlo sin un modelo de IA real
            (Fase 6). Puedes usarlo igualmente para blanqueamiento mientras tanto.
          </p>
        )}

        {previewAntes && previewDespues && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-purple-500 mb-1">Antes</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewAntes} alt="Antes" className="w-full rounded-lg border border-purple-100" />
            </div>
            <div>
              <p className="text-xs text-purple-500 mb-1">Después (aproximación)</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewDespues} alt="Después (aproximación)" className="w-full rounded-lg border border-purple-100" />
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={!previewDespues || enviando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Guardar simulación"}
        </button>
      </form>

      {simulaciones.length === 0 ? (
        <p className="text-center py-6 text-purple-500">Todavía no hay simulaciones guardadas.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {simulaciones.map((s) => (
            <div key={s.id} className="rounded-lg border border-purple-100 overflow-hidden bg-white">
              <div className="grid grid-cols-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imagenAntesUrl} alt="Antes" className="w-full h-20 object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imagenDespuesUrl} alt="Después" className="w-full h-20 object-cover" />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium capitalize">
                  {s.tratamiento}
                  {s.tono && ` · ${s.tono}`}
                </p>
                <p className="text-xs text-purple-400">
                  {new Date(s.createdAt).toLocaleDateString("es-ES")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
