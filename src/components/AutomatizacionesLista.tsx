"use client";

import { useRouter } from "next/navigation";

type Automatizacion = {
  id: string;
  disparador: string;
  canal: string;
  activa: boolean;
  plantilla: string;
};

const NOMBRES_DISPARADOR: Record<string, string> = {
  recordatorio_24h: "Recordatorio 24h antes de la cita",
  confirmacion_reserva: "Confirmación de reserva",
  revision_anual: "Aviso de revisión anual",
  encuesta_satisfaccion: "Encuesta de satisfacción",
  recordatorio_pago: "Recordatorio de pago pendiente",
  presupuesto_sin_agendar: "Seguimiento de presupuesto sin agendar",
};

// Sección 4.9.1. El interruptor activa/desactiva la regla de verdad (se
// persiste), pero el disparo real contra WhatsApp/email requiere un
// scheduler + proveedor real que este scaffold no implementa (ver
// prisma/schema.prisma, AutomatizacionMensaje). // TODO Fase 6
export default function AutomatizacionesLista({
  automatizaciones,
}: {
  automatizaciones: Automatizacion[];
}) {
  const router = useRouter();

  async function alternar(id: string, activa: boolean) {
    const res = await fetch(`/api/seguimiento/automatizaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <ul className="divide-y divide-purple-100">
      {automatizaciones.map((a) => (
        <li key={a.id} className="py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm">
              {NOMBRES_DISPARADOR[a.disparador] ?? a.disparador}
            </p>
            <p className="text-xs text-purple-500 mt-0.5">
              Canal: <span className="capitalize">{a.canal}</span> · “{a.plantilla}”
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={a.activa}
            onClick={() => alternar(a.id, !a.activa)}
            className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${
              a.activa ? "bg-mint" : "bg-purple-200"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                a.activa ? "translate-x-5" : ""
              }`}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
