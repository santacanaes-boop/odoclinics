import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// Nota de diseño (sección 4.1): los datos financieros NO van aquí, viven en
// Contabilidad. Este dashboard es operativo, no económico.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const hoy = new Date();
  const inicio = startOfDay(hoy);
  const fin = endOfDay(hoy);

  const [citasHoy, consentimientosPendientes, usuarioActual] = await Promise.all([
    prisma.cita.count({
      where: { fechaHora: { gte: inicio, lte: fin }, estado: { not: "cancelada" } },
    }),
    prisma.consentimiento.count({ where: { estado: "pendiente" } }),
    prisma.usuario.findUnique({
      where: { id: (session!.user as any).id },
      select: { mfaEnabled: true },
    }),
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

      {!usuarioActual?.mfaEnabled && (
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap rounded-lg bg-danger/10 border border-danger/30 px-4 py-3 text-sm">
          <span>
            ⚠ Tu cuenta todavía no tiene verificación en dos pasos activada — obligatoria
            antes de manejar pacientes reales (sección 7).
          </span>
          <Link href="/mfa" className="font-medium text-danger underline shrink-0">
            Activarla ahora
          </Link>
        </div>
      )}

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
