import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import SinPermiso from "@/components/SinPermiso";
import { startOfMonth, endOfMonth } from "date-fns";
import EncargoForm from "@/components/EncargoForm";
import EncargosLista from "@/components/EncargosLista";

// Sección 4.4: encargos externos a laboratorio protésico, vinculados al
// paciente. KPIs reales desde BD, "con retraso" calculado (no persistido)
// comparando fechaEntregaEstimada con la fecha actual.
export default async function LaboratorioPage() {
  const { autorizado } = await requierePermiso("laboratorio", "lectura");
  if (!autorizado) return <SinPermiso titulo="Laboratorio" />;

  const ahora = new Date();
  const inicioMes = startOfMonth(ahora);
  const finMes = endOfMonth(ahora);

  const [encargos, pacientes, laboratorios, costeMes] = await Promise.all([
    prisma.encargoLaboratorio.findMany({
      include: {
        paciente: { select: { nombre: true, apellidos: true } },
        laboratorio: { select: { nombre: true } },
      },
      orderBy: { fechaEnvio: "desc" },
    }),
    prisma.paciente.findMany({
      select: { id: true, nombre: true, apellidos: true },
      orderBy: { apellidos: "asc" },
    }),
    prisma.laboratorio.findMany({ orderBy: { nombre: "asc" } }),
    prisma.encargoLaboratorio.aggregate({
      _sum: { coste: true },
      where: { fechaEnvio: { gte: inicioMes, lte: finMes } },
    }),
  ]);

  const enCurso = encargos.filter((e) => e.estado === "en_proceso").length;
  const listosParaColocar = encargos.filter((e) => e.estado === "listo_para_colocar").length;
  const conRetraso = encargos.filter(
    (e) => e.estado === "en_proceso" && e.fechaEntregaEstimada.getTime() < ahora.getTime()
  ).length;

  const kpis = [
    { label: "Encargos en curso", valor: enCurso },
    { label: "Listos para colocar", valor: listosParaColocar },
    { label: "Con retraso", valor: conRetraso },
    { label: "Coste del mes", valor: `${Number(costeMes._sum.coste ?? 0).toFixed(2)} €` },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-6">Laboratorio protésico</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-purple-100 p-5">
            <p className="text-2xl font-mono font-semibold text-purple-700">{kpi.valor}</p>
            <p className="text-sm text-purple-600 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-purple-100 p-6 mb-6">
        <h2 className="font-medium mb-3">Nuevo encargo</h2>
        <EncargoForm pacientes={pacientes} laboratorios={laboratorios} />
      </div>

      <div className="bg-white rounded-xl border border-purple-100 p-6">
        <h2 className="font-medium mb-3">Encargos</h2>
        <EncargosLista encargos={encargos} ahora={ahora.getTime()} />
      </div>
    </div>
  );
}
