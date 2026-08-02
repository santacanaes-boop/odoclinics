import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// Nota de diseño (sección 4.1): los datos financieros NO van aquí, viven en
// Contabilidad. Este dashboard es operativo, no económico.
export default async function DashboardPage() {
  const hoy = new Date();
  const inicio = startOfDay(hoy);
  const fin = endOfDay(hoy);

  const [citasHoy, consentimientosPendientes] = await Promise.all([
    prisma.cita.count({
      where: { fechaHora: { gte: inicio, lte: fin }, estado: { not: "cancelada" } },
    }),
    prisma.consentimiento.count({ where: { estado: "pendiente" } }),
  ]);

  const kpis = [
    { label: "Citas hoy", valor: citasHoy },
    { label: "Consentimientos pendientes", valor: consentimientosPendientes },
    // Ocupación de agenda y stock bajo se añaden cuando existan los módulos
    // correspondientes completos (Fase 2/3 del roadmap).
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-6">Inicio</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-purple-100 p-5"
          >
            <p className="text-3xl font-mono font-semibold text-purple-700">
              {kpi.valor}
            </p>
            <p className="text-sm text-purple-600 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
