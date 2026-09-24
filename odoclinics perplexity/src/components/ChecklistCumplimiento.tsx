"use client";

import { useRouter } from "next/navigation";

type Item = {
  id: string;
  texto: string;
  completado: boolean;
  actualizadoEn: string | Date | null;
  actualizadoPor: string | null;
};

// Atestación manual (secciones 4.10.1 y 7): marcar un ítem confirma que el
// equipo ya lo ha hecho de verdad en su infraestructura real — esto no
// escanea nada automáticamente.
export default function ChecklistCumplimiento({ items }: { items: Item[] }) {
  const router = useRouter();

  async function alternar(id: string, completado: boolean) {
    const res = await fetch(`/api/proteccion-datos/checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <ul className="divide-y divide-purple-100">
      {items.map((item) => (
        <li key={item.id} className="py-3 flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm ${item.completado ? "text-purple-400 line-through" : ""}`}>
              {item.texto}
            </p>
            {item.completado && item.actualizadoEn && (
              <p className="text-xs text-purple-400 mt-0.5">
                Marcado el {new Date(item.actualizadoEn).toLocaleDateString("es-ES")}
                {item.actualizadoPor && ` por ${item.actualizadoPor}`}
              </p>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={item.completado}
            onClick={() => alternar(item.id, !item.completado)}
            className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${
              item.completado ? "bg-mint" : "bg-purple-200"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                item.completado ? "translate-x-5" : ""
              }`}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
