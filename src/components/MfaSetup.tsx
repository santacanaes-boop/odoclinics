"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Activación de MFA (sección 7). Flujo: generar secreto + QR → escanear con
// una app de autenticación (Google Authenticator, Authy...) → confirmar con
// un código para activar de verdad.
export default function MfaSetup() {
  const router = useRouter();
  const [qr, setQr] = useState<string | null>(null);
  const [secreto, setSecreto] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function iniciar() {
    setCargando(true);
    setError(null);
    const res = await fetch("/api/auth/mfa/iniciar", { method: "POST" });
    setCargando(false);
    if (!res.ok) {
      setError("No se ha podido generar el código QR.");
      return;
    }
    const data = await res.json();
    setQr(data.qr);
    setSecreto(data.secreto);
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const res = await fetch("/api/auth/mfa/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    setCargando(false);
    if (!res.ok) {
      setError("Código incorrecto. Revisa la hora de tu móvil y vuelve a intentarlo.");
      return;
    }
    router.refresh();
  }

  if (!qr) {
    return (
      <div>
        <p className="text-sm text-purple-600 mb-4">
          La verificación en dos pasos añade una capa extra de seguridad: además de tu
          contraseña, necesitarás un código de 6 dígitos generado por una app de
          autenticación (Google Authenticator, Authy, 1Password...) cada vez que inicies
          sesión.
        </p>
        <button
          type="button"
          onClick={iniciar}
          disabled={cargando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {cargando ? "Generando…" : "Activar verificación en dos pasos"}
        </button>
        {error && <p className="text-sm text-danger mt-3">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-purple-600 mb-4">
        Escanea este código QR con tu app de autenticación:
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="Código QR para configurar MFA" className="w-48 h-48 border border-purple-100 rounded-lg mb-3" />
      <p className="text-xs text-purple-400 mb-4">
        ¿No puedes escanear el QR? Introduce esta clave manualmente:{" "}
        <span className="font-mono">{secreto}</span>
      </p>

      <form onSubmit={confirmar} className="space-y-3">
        <label className="block">
          <span className="block text-xs text-purple-500 mb-1">
            Código de 6 dígitos generado por la app
          </span>
          <input
            required
            inputMode="numeric"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm font-mono tracking-widest"
          />
        </label>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {cargando ? "Verificando…" : "Confirmar y activar"}
        </button>
      </form>
      {error && <p className="text-sm text-danger mt-3">{error}</p>}
    </div>
  );
}
