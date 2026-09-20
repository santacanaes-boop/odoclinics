// Clasificación automática del kanban de seguimiento (sección 4.9.2):
// "En tratamiento / Revisión pendiente / Inactivo (+12 meses sin visita) /
// Fidelizado". Se calcula siempre desde las citas reales del paciente, sin
// datos hardcoded.
export type EstadoSeguimiento =
  | "en_tratamiento"
  | "revision_pendiente"
  | "inactivo"
  | "fidelizado";

const DIA_MS = 24 * 60 * 60 * 1000;
const TREINTA_DIAS_MS = 30 * DIA_MS;
const SEIS_MESES_MS = 183 * DIA_MS;
const DOCE_MESES_MS = 365 * DIA_MS;

export function clasificarPaciente(
  citas: { fechaHora: Date; estado: string }[],
  ahora: Date = new Date()
): EstadoSeguimiento {
  const noCanceladas = citas.filter((c) => c.estado !== "cancelada");
  if (noCanceladas.length === 0) return "inactivo";

  const futuras = noCanceladas.filter((c) => c.fechaHora > ahora);
  const pasadas = noCanceladas
    .filter((c) => c.fechaHora <= ahora)
    .sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime());
  const ultimaCita = pasadas[0]?.fechaHora;
  const primeraCita = noCanceladas.reduce(
    (min, c) => (c.fechaHora < min ? c.fechaHora : min),
    noCanceladas[0].fechaHora
  );

  if (futuras.length > 0 || (ultimaCita && ahora.getTime() - ultimaCita.getTime() <= TREINTA_DIAS_MS)) {
    return "en_tratamiento";
  }

  if (!ultimaCita || ahora.getTime() - ultimaCita.getTime() > DOCE_MESES_MS) {
    return "inactivo";
  }

  if (ahora.getTime() - ultimaCita.getTime() > SEIS_MESES_MS) {
    return "revision_pendiente";
  }

  const antiguedad = ahora.getTime() - primeraCita.getTime();
  if (noCanceladas.length >= 3 && antiguedad > DOCE_MESES_MS) {
    return "fidelizado";
  }

  return "revision_pendiente";
}

export const COLUMNAS_SEGUIMIENTO: { id: EstadoSeguimiento; titulo: string }[] = [
  { id: "en_tratamiento", titulo: "En tratamiento" },
  { id: "revision_pendiente", titulo: "Revisión pendiente" },
  { id: "inactivo", titulo: "Inactivo (+12 meses)" },
  { id: "fidelizado", titulo: "Fidelizado" },
];
