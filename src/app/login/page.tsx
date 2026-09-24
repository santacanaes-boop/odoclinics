"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Aviso tras configurar o reiniciar el MFA desde /mfa, que cierra la sesión
// y trae aquí con ?mfa=... (MFA obligatorio, sección 7).
const AVISOS_MFA: Record<string, string> = {
  activado:
    "Verificación en dos pasos activada. Vuelve a entrar: te pediremos el código de tu app.",
  reconfigurar:
    "Verificación en dos pasos reiniciada. Al entrar tendrás que configurarla de nuevo con tu móvil.",
};

// useSearchParams() necesita un límite de Suspense para poder generar la
// página en el build.
export default function LoginPage() {
  return (
    <Suspense>
      <FormularioLogin />
    </Suspense>
  );
}

function FormularioLogin() {
  const router = useRouter();
  const aviso = AVISOS_MFA[useSearchParams().get("mfa") ?? ""];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  // Segundo paso del login cuando el usuario tiene MFA activado (sección 7).
  const [pidiendoOtp, setPidiendoOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const res = await signIn("credentials", {
      email,
      password,
      // NextAuth serializa el objeto de credenciales con URLSearchParams:
      // un valor `undefined` se convierte en el string literal "undefined"
      // en vez de omitirse, así que el servidor lo vería como un código de
      // verificación (incorrecto) en lugar de "no enviado". Hay que mandar
      // siempre una cadena.
      otp: pidiendoOtp ? otp : "",
      redirect: false,
    });

    setCargando(false);

    if (res?.error === "MFA_REQUERIDO") {
      setPidiendoOtp(true);
      return;
    }

    if (res?.error) {
      setError(
        res.error === "CUENTA_BLOQUEADA_TEMPORALMENTE"
          ? "Cuenta bloqueada temporalmente por varios intentos fallidos. Inténtalo de nuevo en unos minutos."
          : res.error === "MFA_INVALIDO"
          ? "Código de verificación incorrecto."
          : res.error === "DEMASIADOS_INTENTOS"
          ? "Demasiados intentos de inicio de sesión. Espera unos minutos antes de volver a intentarlo."
          : "Email o contraseña incorrectos."
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h1 className="font-display text-2xl font-semibold text-purple-700 mb-1">
          Odoclinics
        </h1>
        <p className="text-sm text-purple-600 mb-6">
          {pidiendoOtp ? "Introduce el código de verificación" : "Inicia sesión para continuar"}
        </p>

        {aviso && !pidiendoOtp && (
          <p role="status" className="mb-4 rounded-lg bg-mint/15 border border-mint/40 px-3 py-2 text-sm text-purple-800">
            {aviso}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!pidiendoOtp ? (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-purple-200 px-3 py-3 text-base focus:border-purple-700"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-purple-200 px-3 py-3 text-base focus:border-purple-700"
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="otp" className="block text-sm font-medium mb-1">
                Código de 6 dígitos de tu app de autenticación
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-lg border border-purple-200 px-3 py-3 text-base font-mono tracking-widest focus:border-purple-700"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-purple-700 text-white font-medium py-3 hover:bg-purple-800 disabled:opacity-60"
          >
            {cargando ? "Entrando…" : pidiendoOtp ? "Verificar" : "Entrar"}
          </button>

          {pidiendoOtp && (
            <button
              type="button"
              onClick={() => {
                setPidiendoOtp(false);
                setOtp("");
                setError(null);
              }}
              className="w-full text-sm text-purple-500"
            >
              ← Volver
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
