import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { clasificarPaciente, COLUMNAS_SEGUIMIENTO } from "@/lib/seguimiento";
import { enlaceWhatsApp, enlaceEmail } from "@/lib/contacto";
import AutomatizacionesLista from "@/components/AutomatizacionesLista";

// Sección 4.9: "reutiliza el mismo motor de automatizaciones... en 3
// pestañas". Aquí se muestran apiladas (mismo patrón que Contabilidad y
// Stock) en vez de como pestañas, siguiendo la convención ya usada en el
// resto de la app.
const DISPARADORES_DEFECTO = [
  {
    disparador: "recordatorio_24h",
    canal: "whatsapp",
    plantilla: "Hola {nombre}, te recordamos tu cita mañana en Odoclinics.",
  },
  {
    disparador: "confirmacion_reserva",
    canal: "whatsapp",
    plantilla: "Hola {nombre}, tu cita ha quedado confirmada en Odoclinics.",
  },
  {
    disparador: "revision_anual",
    canal: "email",
    plantilla: "Hola {nombre}, ha pasado un año desde tu última revisión. ¿Reservamos cita?",
  },
  {
    disparador: "encuesta_satisfaccion",
    canal: "email",
    plantilla: "Gracias por tu visita, {nombre}. ¿Nos cuentas qué tal ha ido?",
  },
  {
    disparador: "recordatorio_pago",
    canal: "whatsapp",
    plantilla: "Hola {nombre}, tienes un pago pendiente en Odoclinics.",
  },
  {
    disparador: "presupuesto_sin_agendar",
    canal: "whatsapp",
    plantilla: "Hola {nombre}, ¿te ayudamos a agendar el tratamiento presupuestado?",
  },
];

const OCHO_MESES_MS = 8 * 30 * 24 * 60 * 60 * 1000;
const TREINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;
const QUINCE_DIAS_MS = 15 * 24 * 60 * 60 * 1000;

export default async function SeguimientoPage() {
  // Idempotente y atómico: asegura que las 6 reglas de la sección 4.9.1
  // existan. createMany + skipDuplicates evita la condición de carrera que
  // seis `upsert` en paralelo (Promise.all) provocaban cuando dos peticiones
  // concurrentes intentaban crear la misma regla a la vez (P2002 en
  // `disparador`, visto durante `next build`).
  await prisma.automatizacionMensaje.createMany({
    data: DISPARADORES_DEFECTO,
    skipDuplicates: true,
  });

  const ahora = new Date();

  const [automatizaciones, pacientes, presupuestosPendientes, facturasPendientes] =
    await Promise.all([
      prisma.automatizacionMensaje.findMany({ orderBy: { disparador: "asc" } }),
      prisma.paciente.findMany({
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          telefono: true,
          email: true,
          citas: { select: { fechaHora: true, estado: true } },
        },
      }),
      prisma.presupuesto.findMany({
        where: { estado: "pendiente" },
        include: {
          paciente: { select: { id: true, nombre: true, apellidos: true, telefono: true, email: true } },
        },
      }),
      prisma.factura.findMany({
        where: { estado: "pendiente" },
        include: {
          paciente: { select: { id: true, nombre: true, apellidos: true, telefono: true, email: true } },
        },
      }),
    ]);

  const porColumna = new Map<string, typeof pacientes>();
  for (const col of COLUMNAS_SEGUIMIENTO) porColumna.set(col.id, []);
  const citasPorPaciente = new Map(pacientes.map((p) => [p.id, p.citas]));
  for (const p of pacientes) {
    porColumna.get(clasificarPaciente(p.citas, ahora))!.push(p);
  }

  const revisionesPendientes = (porColumna.get("revision_pendiente") ?? []).filter((p) => {
    const pasadas = p.citas
      .filter((c) => c.estado !== "cancelada" && c.fechaHora <= ahora)
      .sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime());
    const ultima = pasadas[0];
    return ultima && ahora.getTime() - ultima.fechaHora.getTime() > OCHO_MESES_MS;
  });

  const presupuestosSinAgendar = presupuestosPendientes.filter((pr) => {
    if (ahora.getTime() - pr.fecha.getTime() < TREINTA_DIAS_MS) return false;
    const citas = citasPorPaciente.get(pr.pacienteId) ?? [];
    return !citas.some((c) => c.estado !== "cancelada" && c.fechaHora > pr.fecha);
  });

  const facturasAtrasadas = facturasPendientes.filter(
    (f) => ahora.getTime() - f.fecha.getTime() > QUINCE_DIAS_MS
  );

  const recomendaciones = [
    ...revisionesPendientes.map((p) => ({
      id: `revision-${p.id}`,
      tipo: "Revisión pendiente",
      paciente: p,
      mensaje: `Hola ${p.nombre}, ha pasado tiempo desde tu última visita a Odoclinics. ¿Reservamos tu revisión?`,
    })),
    ...presupuestosSinAgendar.map((pr) => ({
      id: `presupuesto-${pr.id}`,
      tipo: "Presupuesto sin agendar",
      paciente: pr.paciente,
      mensaje: `Hola ${pr.paciente.nombre}, vimos que tienes un presupuesto pendiente de agendar en Odoclinics. ¿Te ayudamos a encontrar hueco?`,
    })),
    ...facturasAtrasadas.map((f) => ({
      id: `factura-${f.id}`,
      tipo: "Pago pendiente",
      paciente: f.paciente,
      mensaje: `Hola ${f.paciente.nombre}, tienes un pago pendiente de ${Number(f.importe).toFixed(2)} € en Odoclinics.`,
    })),
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-6">Seguimiento</h1>

      <section className="bg-white rounded-xl border border-purple-100 p-6 mb-6">
        <h2 className="font-medium mb-1">Automatizaciones</h2>
        <p className="text-xs text-purple-500 mb-3">
          Activar una regla la deja lista para cuando exista un canal de envío real (WhatsApp
          Business API / proveedor de email). Hoy no dispara mensajes automáticamente — ver
          "Recomendaciones" para contactar manualmente mientras tanto.
        </p>
        <AutomatizacionesLista automatizaciones={automatizaciones} />
      </section>

      <section className="mb-6">
        <h2 className="font-medium mb-3">Seguimiento de pacientes</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNAS_SEGUIMIENTO.map((col) => {
            const items = porColumna.get(col.id) ?? [];
            return (
              <div key={col.id} className="bg-white rounded-xl border border-purple-100 p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center justify-between">
                  {col.titulo}
                  <span className="text-xs font-mono text-purple-400">{items.length}</span>
                </h3>
                <ul className="space-y-2">
                  {items.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/pacientes/${p.id}`}
                        className="block rounded-lg border border-purple-100 px-3 py-2 text-xs hover:bg-purple-50"
                      >
                        {p.apellidos}, {p.nombre}
                      </Link>
                    </li>
                  ))}
                  {items.length === 0 && <li className="text-xs text-purple-300">—</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-purple-100 p-6">
        <h2 className="font-medium mb-3">Recomendaciones</h2>
        {recomendaciones.length === 0 ? (
          <p className="text-center py-6 text-purple-500">No hay avisos accionables ahora mismo.</p>
        ) : (
          <ul className="space-y-3">
            {recomendaciones.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-purple-100 p-4 flex items-center justify-between flex-wrap gap-3"
              >
                <div>
                  <p className="text-xs text-purple-500 font-medium">{r.tipo}</p>
                  <p className="text-sm">
                    {r.paciente.apellidos}, {r.paciente.nombre}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={enlaceWhatsApp(r.paciente.telefono, r.mensaje)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-mint/20 text-purple-800 text-xs font-medium px-3 py-1"
                  >
                    Contactar por WhatsApp
                  </a>
                  {r.paciente.email && (
                    <a
                      href={enlaceEmail(r.paciente.email, r.tipo, r.mensaje)}
                      className="rounded-full bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1"
                    >
                      Enviar email
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
