import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import SinPermiso from "@/components/SinPermiso";
import { startOfMonth, endOfMonth } from "date-fns";
import FacturaForm from "@/components/FacturaForm";
import GastoForm from "@/components/GastoForm";
import PanelPendiente from "@/components/PanelPendiente";

// Sección 4.5. KPIs calculados en tiempo real desde BD, nunca hardcoded —
// mismo principio que el dashboard de Inicio (sección 4.1). Veri-Factu,
// cuenta bancaria e integración con programa contable no se simulan: se
// muestran como pendientes hasta que exista la integración real (Fase 6).
export default async function ContabilidadPage() {
  const { autorizado } = await requierePermiso("contabilidad", "lectura");
  if (!autorizado) return <SinPermiso titulo="Contabilidad" />;

  const ahora = new Date();
  const inicioMes = startOfMonth(ahora);
  const finMes = endOfMonth(ahora);

  const [ingresosMes, gastosMes, deudas, ultimasFacturas, ultimosGastos, pacientes] =
    await Promise.all([
      prisma.factura.aggregate({
        _sum: { importe: true },
        where: { estado: "pagada", fecha: { gte: inicioMes, lte: finMes } },
      }),
      prisma.gasto.aggregate({
        _sum: { importe: true },
        where: { fecha: { gte: inicioMes, lte: finMes } },
      }),
      prisma.factura.aggregate({
        _sum: { importe: true },
        where: { estado: "pendiente" },
      }),
      prisma.factura.findMany({
        orderBy: { fecha: "desc" },
        take: 10,
        include: { paciente: { select: { nombre: true, apellidos: true } } },
      }),
      prisma.gasto.findMany({ orderBy: { fecha: "desc" }, take: 5 }),
      prisma.paciente.findMany({
        select: { id: true, nombre: true, apellidos: true },
        orderBy: { apellidos: "asc" },
      }),
    ]);

  const totalIngresos = Number(ingresosMes._sum.importe ?? 0);
  const totalGastos = Number(gastosMes._sum.importe ?? 0);
  const beneficioNeto = totalIngresos - totalGastos;
  const totalDeudas = Number(deudas._sum.importe ?? 0);

  const kpis = [
    { label: "Ingresos del mes", valor: totalIngresos },
    { label: "Gastos del mes", valor: totalGastos },
    { label: "Beneficio neto", valor: beneficioNeto },
    { label: "Deudas pendientes", valor: totalDeudas },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-6">Contabilidad</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-purple-100 p-5">
            <p className="text-2xl font-mono font-semibold text-purple-700">
              {kpi.valor.toFixed(2)} €
            </p>
            <p className="text-sm text-purple-600 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-purple-100 p-6">
          <h2 className="font-medium mb-3">Nueva factura</h2>
          <FacturaForm pacientes={pacientes} />
        </div>

        <div className="bg-white rounded-xl border border-purple-100 p-6">
          <h2 className="font-medium mb-3">Nuevo gasto</h2>
          <GastoForm />

          {ultimosGastos.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {ultimosGastos.map((g) => (
                <li key={g.id} className="flex justify-between border-t border-purple-100 pt-2">
                  <span>
                    {g.concepto} <span className="text-purple-400">· {g.categoria}</span>
                  </span>
                  <span className="font-mono">{Number(g.importe).toFixed(2)} €</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden mb-6">
        <h2 className="font-medium p-6 pb-3">Últimas facturas</h2>
        {ultimasFacturas.length === 0 ? (
          <p className="text-center py-6 text-purple-500">Todavía no hay facturas registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-purple-100 text-purple-700 text-left">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Importe</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ultimasFacturas.map((f) => (
                <tr key={f.id} className="border-t border-purple-100">
                  <td className="px-4 py-3">{f.fecha.toLocaleDateString("es-ES")}</td>
                  <td className="px-4 py-3">
                    {f.paciente.apellidos}, {f.paciente.nombre}
                  </td>
                  <td className="px-4 py-3 font-mono">{Number(f.importe).toFixed(2)} €</td>
                  <td className="px-4 py-3 capitalize">{f.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <PanelPendiente
          titulo="Veri-Factu"
          texto="Registro inalterable con huella electrónica y envío a AEAT. Requiere certificado digital y homologación del software — obligatorio antes de facturar con datos reales (sección 6)."
        />
        <PanelPendiente
          titulo="Cuenta bancaria"
          texto="Conciliación automática vía Open Banking (PSD2). Pendiente de elegir proveedor y dar de alta las credenciales cifradas en servidor."
        />
        <PanelPendiente
          titulo="Programa contable"
          texto="Exportación de asientos al Plan General Contable (ContaSOL, A3, Sage, Holded...). Pendiente de decidir el software definitivo."
        />
      </div>
    </div>
  );
}
