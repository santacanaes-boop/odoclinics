"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MfaDesactivar() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const res = await fetch("/api/auth/mfa/desactivar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setCargando(false);

    if (!res.ok) {
      setError("Contraseña incorrecta.");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <p className="text-sm text-purple-700 font-medium mb-1">✓ Verificación en dos pasos activada</p>
      <p className="text-xs text-purple-500 mb-4">
        Tu cuenta pide un código de tu app de autenticación en cada inicio de sesión.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-xs text-purple-500 mb-1">
            Confirma tu contraseña para desactivarla
          </span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-danger/10 text-danger px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {cargando ? "Desactivando…" : "Desactivar"}
        </button>
      </form>
      {error && <p className="text-sm text-danger mt-3">{error}</p>}
    </div>
  );
}
