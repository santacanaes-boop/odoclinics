"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PIEZAS_FDI,
  ESTADOS_PIEZA,
  COLOR_ESTADO,
  TEXTO_CLARO_ESTADO,
  type EstadoPieza,
} from "@/lib/odontograma";

type Pieza = { piezaFdi: number; estado: EstadoPieza };

// Odontograma editable (sección 4.3.3): 32 piezas en notación FDI, con
// leyenda de colores. Tocar una pieza rota su estado al siguiente de la
// lista — pensado para edición rápida en tablet, sin selector adicional.
export default function Odontograma({
  pacienteId,
  piezas,
}: {
  pacienteId: string;
  piezas: Pieza[];
}) {
  const router = useRouter();
  const [estadoPorPieza, setEstadoPorPieza] = useState<Record<number, EstadoPieza>>(() =>
    Object.fromEntries(piezas.map((p) => [p.piezaFdi, p.estado]))
  );
  const [guardando, setGuardando] = useState<number | null>(null);

  async function cambiarEstado(piezaFdi: number) {
    const actual = estadoPorPieza[piezaFdi] ?? "sano";
    const siguiente =
      ESTADOS_PIEZA[(ESTADOS_PIEZA.indexOf(actual) + 1) % ESTADOS_PIEZA.length];

    setGuardando(piezaFdi);
    const res = await fetch(`/api/pacientes/${pacienteId}/odontograma`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ piezaFdi, estado: siguiente }),
    });
    setGuardando(null);

    if (res.ok) {
      setEstadoPorPieza((prev) => ({ ...prev, [piezaFdi]: siguiente }));
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex flex-col items-center gap-2 mb-4 overflow-x-auto">
        <Fila
          piezas={PIEZAS_FDI.slice(0, 16)}
          estadoPorPieza={estadoPorPieza}
          guardando={guardando}
          onClick={cambiarEstado}
        />
        <Fila
          piezas={PIEZAS_FDI.slice(16, 32)}
          estadoPorPieza={estadoPorPieza}
          guardando={guardando}
          onClick={cambiarEstado}
        />
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {ESTADOS_PIEZA.map((estado) => (
          <span key={estado} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full border border-purple-300"
              style={{ backgroundColor: COLOR_ESTADO[estado] }}
            />
            <span className="capitalize text-purple-600">{estado}</span>
          </span>
        ))}
      </div>
      <p className="text-xs text-purple-400 mt-2">
        Toca una pieza para cambiar su estado.
      </p>
    </div>
  );
}

function Fila({
  piezas,
  estadoPorPieza,
  guardando,
  onClick,
}: {
  piezas: readonly number[];
  estadoPorPieza: Record<number, EstadoPieza>;
  guardando: number | null;
  onClick: (piezaFdi: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {piezas.map((piezaFdi) => {
        const estado = estadoPorPieza[piezaFdi] ?? "sano";
        return (
          <button
            key={piezaFdi}
            type="button"
            onClick={() => onClick(piezaFdi)}
            disabled={guardando === piezaFdi}
            title={`Pieza ${piezaFdi} — ${estado}`}
            className={`w-8 h-8 shrink-0 rounded-md border border-purple-300 text-[10px] font-mono flex items-center justify-center disabled:opacity-50 ${
              TEXTO_CLARO_ESTADO[estado] ? "text-white" : "text-purple-900"
            }`}
            style={{ backgroundColor: COLOR_ESTADO[estado] }}
          >
            {piezaFdi}
          </button>
        );
      })}
    </div>
  );
}
