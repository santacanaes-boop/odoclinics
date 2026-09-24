"use client";

import { useRouter } from "next/navigation";

type Encargo = {
  id: string;
  trabajo: string;
  coste: unknown;
  estado: string;
  fechaEnvio: string | Date;
  fechaEntregaEstimada: string | Date;
  paciente: { nombre: string; apellidos: string };
  laboratorio: { nombre: string };
};

// `ahora` llega del servidor: calcularlo aquí con Date.now() daría un valor
// distinto en servidor y navegador (y un aviso de "retraso" que parpadea).
export default function EncargosLista({
  encargos,
  ahora,
}: {
  encargos: Encargo[];
  ahora: number;
}) {
  const router = useRouter();

  async function cambiarEstado(id: string, estado: "listo_para_colocar" | "colocado") {
    const res = await fetch(`/api/laboratorio/encargos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) router.refresh();
  }

  if (encargos.length === 0) {
    return <p className="text-center py-6 text-purple-500">Todavía no hay encargos de laboratorio.</p>;
  }

  return (
    <ul className="space-y-3">
      {encargos.map((e) => {
        const retraso = e.estado === "en_proceso" && new Date(e.fechaEntregaEstimada).getTime() < ahora;
        return (
          <li key={e.id} className="rounded-xl border border-purple-100 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium text-sm">{e.trabajo}</p>
                <p className="text-xs text-purple-500">
                  {e.paciente.apellidos}, {e.paciente.nombre} · {e.laboratorio.nombre} ·{" "}
                  {Number(e.coste).toFixed(2)} €
                </p>
                <p className="text-xs text-purple-400">
                  Enviado el {new Date(e.fechaEnvio).toLocaleDateString("es-ES")} · entrega estimada{" "}
                  {new Date(e.fechaEntregaEstimada).toLocaleDateString("es-ES")}
                  {retraso && <span className="text-danger font-medium"> · ⚠ Con retraso</span>}
                </p>
              </div>

              {e.estado === "en_proceso" && (
                <button
                  type="button"
                  onClick={() => cambiarEstado(e.id, "listo_para_colocar")}
                  className="rounded-full bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1"
                >
                  Marcar listo para colocar
                </button>
              )}
              {e.estado === "listo_para_colocar" && (
                <button
                  type="button"
                  onClick={() => cambiarEstado(e.id, "colocado")}
                  className="rounded-full bg-mint/20 text-purple-800 text-xs font-medium px-3 py-1"
                >
                  Marcar colocado
                </button>
              )}
              {e.estado === "colocado" && (
                <span className="rounded-full bg-mint/20 text-purple-800 text-xs font-medium px-3 py-1">
                  Colocado
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
