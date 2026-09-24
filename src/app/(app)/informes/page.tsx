import { format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import {
  horasGabineteSemana,
  presupuestosPendientes,
  resumenConComparativa,
  serieSemanal,
  topTratamientos,
} from "@/lib/informes";

// Sección 4.7. A diferencia del resto de páginas, esta comprueba el permiso
// del módulo en el propio servidor antes de consultar nada: son datos
// económicos agregados de toda la clínica y no hay API intermedia.
export default async function InformesPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const { autorizado, session } = await requierePermiso("informes", "lectura");
  if (!autorizado) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold mb-6">Informes</h1>
        <p className="text-purple-600">No tienes permiso para ver los informes.</p>
      </div>
    );
  }

  const mesParam = searchParams.mes ? parse(searchParams.mes, "yyyy-MM", new Date()) : null;
  const mes = mesParam && isValid(mesParam) ? mesParam : new Date();

  const [{ actual, anterior, parcial }, semanas, top, pendientes] = await Promise.all([
    resumenConComparativa(mes),
    serieSemanal(endOfMonthOrToday(mes)),
    topTratamientos(mes),
    presupuestosPendientes(),
  ]);

  await registrarAuditoria({
    usuarioId: (session!.user as any).id,
    accion: "VER_INFORMES",
    entidad: "Informe",
    entidadId: format(mes, "yyyy-MM"),
  });

  const sinHorario = horasGabineteSemana() === null;
  const nombreMes = format(mes, "MMMM yyyy", { locale: es });

  const kpis: Kpi[] = [
    { label: "Facturado", valor: actual.facturado, previo: anterior.facturado, tipo: "euros" },
    { label: "Cobrado", valor: actual.cobrado, previo: anterior.cobrado, tipo: "euros" },
    {
      label: "Producción (tratamientos realizados)",
      valor: actual.produccion,
      previo: anterior.produccion,
      tipo: "euros",
    },
    {
      label: "Valor medio por paciente",
      valor: actual.valorMedioPaciente,
      previo: anterior.valorMedioPaciente,
      tipo: "euros",
      nota: `${actual.pacientesFacturados} pacientes facturados`,
    },
    {
      label: "Nuevos pacientes",
      valor: actual.nuevosPacientes,
      previo: anterior.nuevosPacientes,
      tipo: "numero",
    },
    {
      label: "Ocupación de agenda",
      valor: actual.ocupacion,
      previo: anterior.ocupacion,
      tipo: "porcentaje",
      nota: sinHorario ? "Falta configurar el horario" : undefined,
    },
    {
      label: "Aceptación de presupuestos",
      valor: actual.tasaAceptacion,
      previo: anterior.tasaAceptacion,
      tipo: "porcentaje",
      nota:
        actual.presupuestosEmitidos > 0
          ? `${actual.presupuestosAceptados}/${actual.presupuestosEmitidos} · ${fmtPct(
              actual.tasaAceptacionImporte
            )} del importe`
          : undefined,
    },
    {
      label: "No-shows",
      valor: actual.tasaNoShow,
      previo: anterior.tasaNoShow,
      tipo: "porcentaje",
      menosEsMejor: true,
      nota: `${actual.noShows} no-shows · ${actual.canceladas} canceladas`,
    },
  ];

  const maxProduccion = Math.max(1, ...semanas.map((s) => s.produccion));
  const maxTop = Math.max(1, ...top.map((t) => t.importe));

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Informes</h1>
          <p className="text-sm text-purple-500 mt-1">
            <span className="capitalize">{nombreMes}</span>
            {parcial
              ? ` · del 1 al ${format(actual.fin, "d")}, comparado con los mismos días del mes anterior`
              : " · comparado con el mes anterior"}
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="month"
            name="mes"
            defaultValue={format(mes, "yyyy-MM")}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm">Ver</button>
        </form>
      </div>

      {pendientes.total > 0 && (
        <div className="mb-6 rounded-xl bg-mint/10 border border-mint/40 px-5 py-4 text-sm">
          <span className="font-mono font-semibold">{fmtEuros(pendientes.importe)}</span> en{" "}
          {pendientes.total} presupuesto{pendientes.total === 1 ? "" : "s"} pendiente
          {pendientes.total === 1 ? "" : "s"} de respuesta (todas las fechas) — cada uno es
          un paciente al que llamar.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <TarjetaKpi key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-purple-100 p-6">
          <h2 className="font-medium mb-1">Ocupación semanal de agenda</h2>
          <p className="text-xs text-purple-500 mb-4">
            Minutos citados (incluye no-shows) sobre horas disponibles de los 2 gabinetes.
          </p>
          {sinHorario ? (
            <p className="rounded-lg bg-purple-50 border border-purple-100 p-4 text-xs text-purple-500">
              Falta el horario de la clínica: configura <code>HORAS_GABINETE_SEMANA</code> en{" "}
              <code>.env</code> (horas que cada gabinete está disponible para citar en una semana
              normal) para calcular la ocupación. No se calcula contra un horario inventado.
            </p>
          ) : (
            <Barras
              filas={semanas.map((s) => ({
                etiqueta: format(s.inicio, "d MMM", { locale: es }),
                valor: s.ocupacion ?? 0,
                texto: fmtPct(s.ocupacion),
                max: 100,
              }))}
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-purple-100 p-6">
          <h2 className="font-medium mb-1">Producción semanal</h2>
          <p className="text-xs text-purple-500 mb-4">
            Importe de los tratamientos realizados (historial de tratamientos).
          </p>
          <Barras
            filas={semanas.map((s) => ({
              etiqueta: format(s.inicio, "d MMM", { locale: es }),
              valor: s.produccion,
              texto: fmtEuros(s.produccion),
              max: maxProduccion,
            }))}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-purple-100 p-6">
        <h2 className="font-medium mb-1">Tratamientos que más producen</h2>
        <p className="text-xs text-purple-500 mb-4 capitalize">{nombreMes}</p>
        {top.length === 0 ? (
          <p className="text-center py-6 text-purple-500">
            No hay tratamientos registrados este mes.
          </p>
        ) : (
          <Barras
            filas={top.map((t) => ({
              etiqueta: `${t.concepto} (${t.veces})`,
              valor: t.importe,
              texto: fmtEuros(t.importe),
              max: maxTop,
            }))}
            anchoEtiqueta="w-48"
          />
        )}
      </div>
    </div>
  );
}

// La serie semanal termina en la última semana del mes elegido, o en la
// actual si se está mirando el mes en curso.
function endOfMonthOrToday(mes: Date) {
  const fin = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  return fin > new Date() ? new Date() : fin;
}

type Kpi = {
  label: string;
  valor: number | null;
  previo: number | null;
  tipo: "euros" | "numero" | "porcentaje";
  nota?: string;
  menosEsMejor?: boolean;
};

function TarjetaKpi({ kpi }: { kpi: Kpi }) {
  const formato = (v: number | null) =>
    kpi.tipo === "euros" ? fmtEuros(v) : kpi.tipo === "porcentaje" ? fmtPct(v) : v ?? "—";

  // Variación: puntos porcentuales para porcentajes, % relativo para el resto.
  let variacion: { texto: string; buena: boolean } | null = null;
  if (kpi.valor !== null && kpi.previo !== null) {
    const diff = kpi.valor - kpi.previo;
    if (diff !== 0) {
      const texto =
        kpi.tipo === "porcentaje"
          ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)} pp`
          : kpi.previo !== 0
          ? `${diff > 0 ? "+" : ""}${((diff / Math.abs(kpi.previo)) * 100).toFixed(0)} %`
          : null;
      if (texto) variacion = { texto, buena: kpi.menosEsMejor ? diff < 0 : diff > 0 };
    }
  }

  return (
    <div className="bg-white rounded-xl border border-purple-100 p-5">
      <p className="text-2xl font-mono font-semibold text-purple-700">{formato(kpi.valor)}</p>
      <p className="text-sm text-purple-600 mt-1">{kpi.label}</p>
      <p className="text-xs mt-2 text-purple-400">
        {variacion && (
          <span className={variacion.buena ? "text-mint" : "text-purple-700"}>
            {variacion.buena ? "▲" : "▼"} {variacion.texto} vs mes anterior
          </span>
        )}
        {variacion && kpi.nota && " · "}
        {kpi.nota}
      </p>
    </div>
  );
}

function Barras({
  filas,
  anchoEtiqueta = "w-16",
}: {
  filas: { etiqueta: string; valor: number; texto: string; max: number }[];
  anchoEtiqueta?: string;
}) {
  return (
    <ul className="space-y-2">
      {filas.map((f) => (
        <li key={f.etiqueta} className="flex items-center gap-3 text-sm">
          <span className={`${anchoEtiqueta} shrink-0 truncate text-purple-600`}>{f.etiqueta}</span>
          <div className="flex-1 h-2 rounded-full bg-purple-100 overflow-hidden">
            <div
              className="h-full bg-purple-700"
              style={{ width: `${Math.min(100, (f.valor / f.max) * 100)}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right font-mono text-purple-700">{f.texto}</span>
        </li>
      ))}
    </ul>
  );
}

function fmtEuros(v: number | null) {
  if (v === null) return "—";
  return v.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function fmtPct(v: number | null) {
  return v === null ? "—" : `${v.toFixed(0)} %`;
}
