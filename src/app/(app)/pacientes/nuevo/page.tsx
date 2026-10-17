"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ORIGENES = ["Instagram", "Google", "Recomendación", "Web", "Otro"];

// Alta de paciente (sección 4.3). Enlazado desde /pacientes — esta página no
// existía todavía (el enlace "+ Nuevo paciente" daba 404); se construye
// ahora porque además es la única forma real de capturar `origen`, el dato
// que necesita la gráfica de Marketing (sección 4.8).
export default function NuevoPacientePage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dniNie, setDniNie] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [alertasMedicas, setAlertasMedicas] = useState("");
  const [origen, setOrigen] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const res = await fetch("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        apellidos,
        dniNie,
        fechaNacimiento,
        telefono,
        email: email || undefined,
        direccion: direccion || undefined,
        alertasMedicas: alertasMedicas
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        origen: origen || undefined,
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      setError("No se ha podido crear el paciente. Revisa los datos (el DNI/NIE debe ser único).");
      return;
    }

    const paciente = await res.json();
    router.push(`/pacientes/${paciente.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold mb-6">Nuevo paciente</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-purple-100 p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Campo label="Nombre">
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
            />
          </Campo>
          <Campo label="Apellidos">
            <input
              required
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
            />
          </Campo>
          <Campo label="DNI/NIE">
            <input
              required
              value={dniNie}
              onChange={(e) => setDniNie(e.target.value)}
              className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm font-mono"
            />
          </Campo>
          <Campo label="Fecha de nacimiento">
            <input
              required
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
            />
          </Campo>
          <Campo label="Teléfono">
            <input
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
            />
          </Campo>
          <Campo label="Email (opcional)">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
            />
          </Campo>
        </div>

        <Campo label="Dirección (opcional)">
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
          />
        </Campo>

        <Campo label="Alertas médicas (opcional, separadas por comas)">
          <input
            placeholder="Alergia a la penicilina, anticoagulantes..."
            value={alertasMedicas}
            onChange={(e) => setAlertasMedicas(e.target.value)}
            className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
          />
        </Campo>

        <Campo label="¿Cómo nos ha conocido? (opcional)">
          <select
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
          >
            <option value="">— Sin especificar —</option>
            {ORIGENES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Campo>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {enviando ? "Creando…" : "Crear paciente"}
        </button>
      </form>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-purple-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
