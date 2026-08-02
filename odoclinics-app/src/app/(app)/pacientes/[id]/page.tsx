import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";

// Pestañas de la ficha (sección 4.3). En esta Fase 1 están completas
// Anamnesis e Historial médico; el resto queda con estado vacío explícito
// hasta la Fase 2/3 del roadmap — nunca con datos de relleno engañosos.
const PESTAÑAS_CLINICO = [
  { id: "anamnesis", label: "Anamnesis", disponible: true },
  { id: "historial", label: "Historial médico", disponible: true },
  { id: "odontograma", label: "Odontograma", disponible: false },
  { id: "recetas", label: "Recetas", disponible: false },
  { id: "radiografias", label: "Radiografías", disponible: false },
];
const PESTAÑAS_ADMIN = [
  { id: "consentimientos", label: "Consentimientos", disponible: false },
  { id: "presupuestos", label: "Presupuestos", disponible: false },
  { id: "simulacion", label: "Simulación IA", disponible: false },
];

export default async function FichaPacientePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  const paciente = await prisma.paciente.findUnique({
    where: { id: params.id },
    include: {
      anamnesis: true,
      historial: { orderBy: { fecha: "desc" } },
    },
  });

  if (!paciente) notFound();

  if (session?.user) {
    await registrarAuditoria({
      usuarioId: (session.user as any).id,
      accion: "VER_FICHA_PACIENTE",
      entidad: "Paciente",
      entidadId: paciente.id,
    });
  }

  return (
    <div>
      {/* Cabecera con alertas médicas SIEMPRE visibles — sección 4.3 */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">
          {paciente.nombre} {paciente.apellidos}
        </h1>
        <p className="text-purple-600 font-mono text-sm mt-1">{paciente.dniNie}</p>

        {paciente.alertasMedicas.length > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 bg-danger/10 text-danger border border-danger/30 rounded-lg px-4 py-2 text-sm font-medium">
            ⚠ {paciente.alertasMedicas.join(" · ")}
          </div>
        )}
      </div>

      {/* Selector de grupo — 🩺 Clínico / 📋 Administrativo, sección 4.3 */}
      <div className="space-y-10">
        <section>
          <h2 className="font-display text-xl font-semibold mb-3">🩺 Clínico</h2>
          <div className="flex gap-2 mb-4 flex-wrap">
            {PESTAÑAS_CLINICO.map((t) => (
              <span
                key={t.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  t.disponible
                    ? "bg-purple-100 text-purple-700"
                    : "bg-purple-50 text-purple-300"
                }`}
              >
                {t.label}
                {!t.disponible && " · próximamente"}
              </span>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-purple-100 p-6 mb-4">
            <h3 className="font-medium mb-3">Anamnesis</h3>
            {paciente.anamnesis ? (
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-purple-500">Patologías previas</dt>
                  <dd>{paciente.anamnesis.patologiasPrevias.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-purple-500">Alergias medicamentosas</dt>
                  <dd>{paciente.anamnesis.alergiasMedicamentosas.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-purple-500">Medicación habitual</dt>
                  <dd>{paciente.anamnesis.medicacionHabitual.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-purple-500">Hábitos</dt>
                  <dd>{paciente.anamnesis.habitos.join(", ") || "—"}</dd>
                </div>
              </dl>
            ) : (
              <div className="text-center py-6 text-purple-500">
                <p className="mb-3">Este paciente todavía no ha completado la anamnesis.</p>
                <button className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium">
                  Enviar cuestionario al paciente
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-purple-100 p-6">
            <h3 className="font-medium mb-3">Historial médico</h3>
            {paciente.historial.length === 0 ? (
              <p className="text-center py-6 text-purple-500">
                Todavía no hay tratamientos registrados.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-purple-500">
                  <tr>
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Concepto</th>
                    <th className="py-2">Precio</th>
                    <th className="py-2">Estado de pago</th>
                  </tr>
                </thead>
                <tbody>
                  {paciente.historial.map((h) => (
                    <tr key={h.id} className="border-t border-purple-100">
                      <td className="py-2">{h.fecha.toLocaleDateString("es-ES")}</td>
                      <td className="py-2">{h.concepto}</td>
                      <td className="py-2 font-mono">{Number(h.precio).toFixed(2)} €</td>
                      <td className="py-2 capitalize">{h.estadoPago}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-3">📋 Administrativo</h2>
          <div className="flex gap-2 flex-wrap">
            {PESTAÑAS_ADMIN.map((t) => (
              <span
                key={t.id}
                className="rounded-full px-3 py-1 text-xs font-medium bg-purple-50 text-purple-300"
              >
                {t.label} · próximamente
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
