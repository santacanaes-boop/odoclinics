import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import SinPermiso from "@/components/SinPermiso";
import { registrarAuditoria } from "@/lib/audit";
import { PIEZAS_FDI, type EstadoPieza } from "@/lib/odontograma";
import Odontograma from "@/components/Odontograma";
import Recetas from "@/components/Recetas";
import Radiografias from "@/components/Radiografias";
import Consentimientos from "@/components/Consentimientos";
import Presupuestos from "@/components/Presupuestos";
import SimulacionIA from "@/components/SimulacionIA";

// Pestañas de la ficha (sección 4.3). Fase 2 completó Odontograma, Recetas,
// Radiografías y Consentimientos; Fase 3 añadió Presupuestos con PDF real;
// Fase 5 añade Simulación IA (aproximación visual, ver SimulacionIA.tsx).
const PESTAÑAS_CLINICO = [
  { id: "anamnesis", label: "Anamnesis", disponible: true },
  { id: "historial", label: "Historial médico", disponible: true },
  { id: "odontograma", label: "Odontograma", disponible: true },
  { id: "recetas", label: "Recetas", disponible: true },
  { id: "radiografias", label: "Radiografías", disponible: true },
];
const PESTAÑAS_ADMIN = [
  { id: "consentimientos", label: "Consentimientos", disponible: true },
  { id: "presupuestos", label: "Presupuestos", disponible: true },
  { id: "simulacion", label: "Simulación IA", disponible: true },
];

export default async function FichaPacientePage({
  params,
}: {
  params: { id: string };
}) {
  const { autorizado, session } = await requierePermiso("pacientes", "lectura");
  if (!autorizado) return <SinPermiso titulo="Pacientes" />;


  const paciente = await prisma.paciente.findUnique({
    where: { id: params.id },
    include: {
      anamnesis: true,
      historial: { orderBy: { fecha: "desc" } },
      odontograma: true,
      recetas: { orderBy: { fecha: "desc" } },
      radiografias: { orderBy: { fecha: "desc" } },
      // Consentimiento no tiene campo "fecha" propio (fechaFirma es nulo
      // mientras está pendiente) — se ordenan por id de creación.
      consentimientos: { orderBy: { id: "desc" } },
      presupuestos: { orderBy: { fecha: "desc" } },
      simulacionesIA: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!paciente) notFound();

  // El odontograma siempre muestra las 32 piezas FDI, aunque todavía no
  // tengan registro en BD (se crean en el primer PATCH sobre esa pieza).
  const estadoPorPieza = new Map(
    paciente.odontograma.map((p) => [p.piezaFdi, p.estado as EstadoPieza])
  );
  const piezasOdontograma = PIEZAS_FDI.map((piezaFdi) => ({
    piezaFdi,
    estado: estadoPorPieza.get(piezaFdi) ?? ("sano" as EstadoPieza),
  }));

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

          <div className="bg-white rounded-xl border border-purple-100 p-6 mt-4">
            <h3 className="font-medium mb-3">Odontograma</h3>
            <Odontograma pacienteId={paciente.id} piezas={piezasOdontograma} />
          </div>

          <div className="bg-white rounded-xl border border-purple-100 p-6 mt-4">
            <h3 className="font-medium mb-3">Recetas</h3>
            <Recetas pacienteId={paciente.id} recetas={paciente.recetas} />
          </div>

          <div className="bg-white rounded-xl border border-purple-100 p-6 mt-4">
            <h3 className="font-medium mb-3">Radiografías</h3>
            <Radiografias pacienteId={paciente.id} radiografias={paciente.radiografias} />
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-3">📋 Administrativo</h2>
          <div className="flex gap-2 mb-4 flex-wrap">
            {PESTAÑAS_ADMIN.map((t) => (
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
            <h3 className="font-medium mb-3">Consentimientos</h3>
            <Consentimientos pacienteId={paciente.id} consentimientos={paciente.consentimientos} />
          </div>

          <div className="bg-white rounded-xl border border-purple-100 p-6 mb-4">
            <h3 className="font-medium mb-3">Presupuestos</h3>
            <Presupuestos pacienteId={paciente.id} presupuestos={paciente.presupuestos} />
          </div>

          <div className="bg-white rounded-xl border border-purple-100 p-6">
            <h3 className="font-medium mb-3">Simulación IA</h3>
            <SimulacionIA pacienteId={paciente.id} simulaciones={paciente.simulacionesIA} />
          </div>
        </section>
      </div>
    </div>
  );
}
