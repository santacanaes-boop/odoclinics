// Notación FDI (sección 4.3.3): 32 piezas del adulto, en el orden en que se
// dibujan por cuadrante en la UI — arcada superior (18→11, 21→28) y arcada
// inferior (48→41, 31→38).
export const PIEZAS_FDI = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46,
  45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export const ESTADOS_PIEZA = [
  "sano",
  "caries",
  "empastado",
  "corona",
  "ausente",
] as const;

export type EstadoPieza = (typeof ESTADOS_PIEZA)[number];

export const COLOR_ESTADO: Record<EstadoPieza, string> = {
  sano: "#E9CFEC",
  caries: "#C4362F",
  empastado: "#93379B",
  corona: "#7FB8AE",
  ausente: "#F5E9F6",
};

// Fondos oscuros (caries/empastado) necesitan texto claro para mantener
// contraste legible en tablet.
export const TEXTO_CLARO_ESTADO: Record<EstadoPieza, boolean> = {
  sano: false,
  caries: true,
  empastado: true,
  corona: false,
  ausente: false,
};
