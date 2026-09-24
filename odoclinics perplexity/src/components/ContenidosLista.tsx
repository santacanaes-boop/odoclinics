"use client";

import { useRouter } from "next/navigation";

type Contenido = {
  id: string;
  titulo: string;
  canal: string;
  fecha: string | Date;
  estado: string;
};

const ICONO_CANAL: Record<string, string> = {
  instagram: "📷",
  facebook: "📘",
  email: "✉️",
  blog: "📝",
};

export default function ContenidosLista({ contenidos }: { contenidos: Contenido[] }) {
  const router = useRouter();

  async function marcarPublicado(id: string) {
    const res = await fetch(`/api/marketing/contenidos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "publicado" }),
    });
    if (res.ok) router.refresh();
  }

  if (contenidos.length === 0) {
    return <p className="text-center py-6 text-purple-500">Todavía no hay contenidos planificados.</p>;
  }

  return (
    <ul className="divide-y divide-purple-100">
      {contenidos.map((c) => (
        <li key={c.id} className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden>{ICONO_CANAL[c.canal] ?? "🔗"}</span>
            <div>
              <p className="text-sm font-medium">{c.titulo}</p>
              <p className="text-xs text-purple-500">
                {new Date(c.fecha).toLocaleDateString("es-ES")} · <span className="capitalize">{c.canal}</span>
              </p>
            </div>
          </div>
          {c.estado === "publicado" ? (
            <span className="rounded-full bg-mint/20 text-purple-800 text-xs font-medium px-3 py-1">
              Publicado
            </span>
          ) : (
            <button
              type="button"
              onClick={() => marcarPublicado(c.id)}
              className="rounded-full bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1"
            >
              Marcar publicado
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
