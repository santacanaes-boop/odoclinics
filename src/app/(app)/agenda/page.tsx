import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import SinPermiso from "@/components/SinPermiso";
import { format, addDays, subDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Sección 4.2: "Solo 2 columnas: Gabinete 1 y Gabinete 2 — sin nombre de
// doctor visible en la rejilla". El sistema está preparado para más
// profesionales en el futuro (campo profesionalId en el modelo) sin tener
// que rehacer esta vista.
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { fecha?: string };
}) {
  const { autorizado, session } = await requierePermiso("agenda", "lectura");
  if (!autorizado) return <SinPermiso titulo="Agenda" />;

  const fecha = searchParams.fecha ? parseISO(searchParams.fecha) : new Date();
  const inicioDia = new Date(fecha);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(fecha);
  finDia.setHours(23, 59, 59, 999);

  const citas = await prisma.cita.findMany({
    where: { fechaHora: { gte: inicioDia, lte: finDia } },
    include: { paciente: { select: { nombre: true, apellidos: true } } },
    orderBy: { fechaHora: "asc" },
  });

  // LOPD-GDD (sección 7): la agenda muestra qué paciente viene y a qué
  // tratamiento — se registra quién la consulta, por día.
  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "VER_AGENDA",
    entidad: "Cita",
    entidadId: format(fecha, "yyyy-MM-dd"),
  });

  const gabinete1 = citas.filter((c) => c.gabinete === 1);
  const gabinete2 = citas.filter((c) => c.gabinete === 2);

  const fechaISO = format(fecha, "yyyy-MM-dd");
  const ayer = format(subDays(fecha, 1), "yyyy-MM-dd");
  const manana = format(addDays(fecha, 1), "yyyy-MM-dd");

  const citasHoy = citas.filter((c) => c.estado !== "cancelada").length;
  const canceladas = citas.filter((c) => c.estado === "cancelada").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="font-display text-3xl font-semibold">Agenda</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/agenda?fecha=${ayer}`}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
          >
            ‹ Ayer
          </Link>
          <span className="px-3 py-2 text-sm font-medium capitalize">
            {format(fecha, "EEEE d MMMM", { locale: es })}
          </span>
          <Link
            href={`/agenda?fecha=${manana}`}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
          >
            Mañana ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Kpi label="Citas hoy" valor={citasHoy} />
        <Kpi label="Cancelaciones" valor={canceladas} />
        <Kpi label="Huecos libres" valor="—" />
        <Kpi label="% ocupación" valor="—" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Columna titulo="Gabinete 1" citas={gabinete1} />
        <Columna titulo="Gabinete 2" citas={gabinete2} />
      </div>
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-purple-100 p-5">
      <p className="text-3xl font-mono font-semibold text-purple-700">{valor}</p>
      <p className="text-sm text-purple-600 mt-1">{label}</p>
    </div>
  );
}

function Columna({
  titulo,
  citas,
}: {
  titulo: string;
  citas: Array<{
    id: string;
    fechaHora: Date;
    duracionMin: number;
    tratamiento: string;
    estado: string;
    paciente: { nombre: string; apellidos: string };
  }>;
}) {
  return (
    <div className="bg-white rounded-xl border border-purple-100 p-5">
      <h2 className="font-medium mb-4">{titulo}</h2>
      {citas.length === 0 ? (
        <p className="text-purple-400 text-sm py-8 text-center">
          Sin citas para este gabinete.
        </p>
      ) : (
        <ul className="space-y-2">
          {citas.map((c) => (
            <li
              key={c.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                c.estado === "cancelada"
                  ? "border-purple-100 text-purple-300 line-through"
                  : "border-purple-200"
              }`}
            >
              <div className="flex justify-between font-mono text-xs text-purple-500">
                <span>
                  {c.fechaHora.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>{c.duracionMin} min</span>
              </div>
              <p className="font-medium mt-1">
                {c.paciente.apellidos}, {c.paciente.nombre}
              </p>
              <p className="text-purple-600">{c.tratamiento}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
