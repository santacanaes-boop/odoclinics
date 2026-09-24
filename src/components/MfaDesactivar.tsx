"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

// Con el MFA obligatorio no se puede "apagar": esto borra el segundo factor
// actual (p.ej. al cambiar de móvil) y cierra la sesión; al volver a entrar
// hay que configurarlo de nuevo antes de acceder a nada.
export default function MfaDesactivar() {
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

    await signOut({ callbackUrl: "/login?mfa=reconfigurar" });
  }

  return (
    <div>
      <p className="text-sm text-purple-700 font-medium mb-1">✓ Verificación en dos pasos activada</p>
      <p className="text-xs text-purple-500 mb-4">
        Tu cuenta pide un código de tu app de autenticación en cada inicio de sesión. Si
        cambias de móvil, puedes volver a configurarla: se cerrará la sesión y al entrar
        tendrás que escanear un código QR nuevo.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-xs text-purple-500 mb-1">
            Confirma tu contraseña para volver a configurarla
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
          className="rounded-lg bg-purple-100 text-purple-700 px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {cargando ? "Cerrando sesión…" : "Volver a configurar"}
        </button>
      </form>
      {error && <p className="text-sm text-danger mt-3">{error}</p>}
    </div>
  );
}
