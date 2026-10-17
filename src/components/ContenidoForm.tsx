"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CANALES = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "email", label: "Email" },
  { value: "blog", label: "Blog" },
];

export default function ContenidoForm() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [canal, setCanal] = useState(CANALES[0].value);
  const [fecha, setFecha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const res = await fetch("/api/marketing/contenidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, canal, fecha }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido añadir el contenido.");
      return;
    }

    setTitulo("");
    setFecha("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        required
        placeholder="Título del contenido"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
      />
      {/* flex-wrap en vez de una única fila de grid: un <input type="date">
          nativo no encoge lo suficiente en columnas estrechas y desbordaba
          la tarjeta, dejando el botón "Añadir" fuera del área clicable. */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={canal}
          onChange={(e) => setCanal(e.target.value)}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        >
          {CANALES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          required
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Añadir"}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
