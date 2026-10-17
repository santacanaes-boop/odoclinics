import {
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  isSameMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { prisma } from "./prisma";

// Sección 4.7 — Informes y estadísticas. Todo se calcula en tiempo real
// desde BD (mismo principio que Contabilidad y el dashboard de Inicio):
// ninguna cifra es inventada ni de relleno.

// Sección 4.2: la clínica tiene 2 gabinetes (mismo valor que valida
// src/app/api/citas/route.ts).
export const NUM_GABINETES = 2;

const SEMANA = { weekStartsOn: 1 as const }; // semanas de lunes a domingo

/**
 * Horas que cada gabinete está disponible para citar en una semana normal.
 * Es la base del % de ocupación. Se configura en `.env`
 * (HORAS_GABINETE_SEMANA) en vez de fijarse aquí porque depende del
 * horario real de la clínica — si no está configurado, la ocupación se
 * muestra como pendiente en vez de calcularse contra un horario inventado.
 */
export function horasGabineteSemana(): number | null {
  const valor = Number(process.env.HORAS_GABINETE_SEMANA);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

// Estados que ocupan hueco en la agenda. "no_show" ocupa el hueco igual
// (el gabinete quedó reservado y vacío), por eso cuenta como ocupado y
// además se informa aparte como tasa de no-show.
const ESTADOS_OCUPAN = ["confirmada", "pendiente_confirmacion", "no_show"];

/** Minutos ocupados / minutos disponibles en el rango, o null sin horario. */
function porcentajeOcupacion(minutosOcupados: number, inicio: Date, fin: Date) {
  const horas = horasGabineteSemana();
  if (horas === null) return null;
  // Aproximación: capacidad proporcional a los días del rango. No descuenta
  // festivos ni vacaciones (no existen en el modelo de datos todavía).
  const dias = differenceInCalendarDays(fin, inicio) + 1;
  const minutosDisponibles = horas * 60 * NUM_GABINETES * (dias / 7);
  return minutosDisponibles > 0 ? (minutosOcupados / minutosDisponibles) * 100 : null;
}

function suma(valores: { toString(): string }[]) {
  return valores.reduce((acc: number, v) => acc + Number(v), 0);
}

/** KPIs de un periodo (normalmente un mes natural o parte de él). */
async function resumenPeriodo(inicio: Date, fin: Date) {
  const rango = { gte: inicio, lte: fin };

  const [facturas, citas, presupuestos, nuevosPacientes, produccion] = await Promise.all([
    prisma.factura.findMany({
      where: { fecha: rango, estado: { not: "anulada" } },
      select: { importe: true, estado: true, pacienteId: true },
    }),
    prisma.cita.findMany({
      where: { fechaHora: rango },
      select: { estado: true, duracionMin: true },
    }),
    prisma.presupuesto.findMany({
      where: { fecha: rango },
      select: { estado: true, importeTotal: true },
    }),
    prisma.paciente.count({ where: { createdAt: rango } }),
    prisma.historialTratamiento.aggregate({ _sum: { precio: true }, where: { fecha: rango } }),
  ]);

  const facturado = suma(facturas.map((f) => f.importe));
  const cobrado = suma(facturas.filter((f) => f.estado === "pagada").map((f) => f.importe));
  const pacientesFacturados = new Set(facturas.map((f) => f.pacienteId)).size;

  const citasOcupan = citas.filter((c) => ESTADOS_OCUPAN.includes(c.estado));
  const minutosOcupados = citasOcupan.reduce((acc, c) => acc + c.duracionMin, 0);
  const noShows = citas.filter((c) => c.estado === "no_show").length;
  const canceladas = citas.filter((c) => c.estado === "cancelada").length;

  const presAceptados = presupuestos.filter((p) => p.estado === "aceptado");
  const presPendientes = presupuestos.filter((p) => p.estado === "pendiente");
  const importePresupuestado = suma(presupuestos.map((p) => p.importeTotal));
  const importeAceptado = suma(presAceptados.map((p) => p.importeTotal));

  return {
    inicio,
    fin,
    facturado,
    cobrado,
    produccion: Number(produccion._sum.precio ?? 0),
    nuevosPacientes,
    // Valor medio = facturación del mes / pacientes distintos facturados.
    valorMedioPaciente: pacientesFacturados > 0 ? facturado / pacientesFacturados : null,
    pacientesFacturados,
    ocupacion: porcentajeOcupacion(minutosOcupados, inicio, fin),
    citasTotales: citas.length,
    noShows,
    canceladas,
    // Sobre citas que llegaron a su hora (no se cuentan las canceladas).
    tasaNoShow: citasOcupan.length > 0 ? (noShows / citasOcupan.length) * 100 : null,
    presupuestosEmitidos: presupuestos.length,
    presupuestosAceptados: presAceptados.length,
    presupuestosPendientes: presPendientes.length,
    // % en número y en importe: aceptar muchos presupuestos pequeños y
    // perder los grandes no es lo mismo que al revés.
    tasaAceptacion:
      presupuestos.length > 0 ? (presAceptados.length / presupuestos.length) * 100 : null,
    tasaAceptacionImporte:
      importePresupuestado > 0 ? (importeAceptado / importePresupuestado) * 100 : null,
  };
}

/**
 * Resumen del mes indicado y del anterior, para comparar. Si el mes es el
 * que está en curso, se compara solo hasta hoy contra los mismos días del
 * mes anterior (del 1 al día de hoy): comparar 24 días contra un mes entero
 * daría caídas falsas y llevaría a malas decisiones.
 */
export async function resumenConComparativa(mes: Date) {
  const ahora = new Date();
  const parcial = isSameMonth(mes, ahora);
  const inicio = startOfMonth(mes);
  const fin = parcial ? endOfDay(ahora) : endOfMonth(mes);
  const inicioAnt = subMonths(inicio, 1);
  const finAnt = parcial ? endOfDay(subMonths(ahora, 1)) : endOfMonth(inicioAnt);

  const [actual, anterior] = await Promise.all([
    resumenPeriodo(inicio, fin),
    resumenPeriodo(inicioAnt, finAnt),
  ]);
  return { actual, anterior, parcial };
}

/**
 * Serie semanal (últimas `semanas` semanas terminando en la que contiene
 * `hasta`): ocupación de agenda y producción (tratamientos realizados).
 * La producción aún no se puede desglosar por profesional porque
 * HistorialTratamiento no guarda quién lo realizó — con una sola odontóloga
 * hoy no aporta; cuando crezca el equipo, añadir profesionalId a ese modelo
 * y agrupar aquí.
 */
export async function serieSemanal(hasta: Date, semanas = 8) {
  const inicioSerie = startOfWeek(addWeeks(hasta, -(semanas - 1)), SEMANA);
  const finSerie = endOfWeek(hasta, SEMANA);

  const [citas, tratamientos] = await Promise.all([
    prisma.cita.findMany({
      where: { fechaHora: { gte: inicioSerie, lte: finSerie }, estado: { in: ESTADOS_OCUPAN } },
      select: { fechaHora: true, duracionMin: true },
    }),
    prisma.historialTratamiento.findMany({
      where: { fecha: { gte: inicioSerie, lte: finSerie } },
      select: { fecha: true, precio: true },
    }),
  ]);

  return Array.from({ length: semanas }, (_, i) => {
    const inicio = addWeeks(inicioSerie, i);
    const fin = endOfWeek(inicio, SEMANA);
    const dentro = (d: Date) => d >= inicio && d <= fin;
    const minutos = citas
      .filter((c) => dentro(c.fechaHora))
      .reduce((acc, c) => acc + c.duracionMin, 0);
    return {
      inicio,
      ocupacion: porcentajeOcupacion(minutos, inicio, fin),
      produccion: suma(tratamientos.filter((t) => dentro(t.fecha)).map((t) => t.precio)),
    };
  });
}

/** Tratamientos que más producen en el mes (por importe). */
export async function topTratamientos(mes: Date, limite = 8) {
  const grupos = await prisma.historialTratamiento.groupBy({
    by: ["concepto"],
    where: { fecha: { gte: startOfMonth(mes), lte: endOfMonth(mes) } },
    _sum: { precio: true },
    _count: { _all: true },
  });
  return grupos
    .map((g) => ({ concepto: g.concepto, importe: Number(g._sum.precio ?? 0), veces: g._count._all }))
    .sort((a, b) => b.importe - a.importe)
    .slice(0, limite);
}

/**
 * Dinero "encima de la mesa": presupuestos pendientes de respuesta, de
 * cualquier fecha. Es la palanca de facturación más directa — cada uno es
 * un paciente al que llamar.
 */
export async function presupuestosPendientes() {
  const r = await prisma.presupuesto.aggregate({
    where: { estado: "pendiente" },
    _sum: { importeTotal: true },
    _count: { _all: true },
  });
  return { total: r._count._all, importe: Number(r._sum.importeTotal ?? 0) };
}
