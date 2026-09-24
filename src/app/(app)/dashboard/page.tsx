import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requierePermiso, tieneAcceso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import SinPermiso from "@/components/SinPermiso";
import { startOfDay, endOfDay, format } from "date-fns";
import { es } from "date-fns/locale";

// Sección 4.1: lo que el equipo necesita ver al empezar el día. Es un
// panel operativo, no económico: los datos financieros NO van aquí, viven
// en Contabilidad e Informes.
//
// Cada bloque se muestra solo si el rol tiene acceso a su módulo: Inicio no
// debe convertirse en una puerta trasera a Agenda, Stock o Laboratorio.
export default async function DashboardPage() {
  const { autorizado, session } = await requierePermiso("inicio", "lectura");
  if (!autorizado) return <SinPermiso titulo="Inicio" />;

  const permisos = session!.user.permisos;
  const verAgenda = tieneAcceso(permisos, "agenda");
  const verPacientes = tieneAcceso(permisos, "pacientes");
  const verStock = tieneAcceso(permisos, "stock");
  const verLaboratorio = tieneAcceso(permisos, "laboratorio");

  const ahora = new Date();
  const hoy = { gte: startOfDay(ahora), lte: endOfDay(ahora) };

  const [citasHoy, consentimientosPendientes, productos, encargos] = await Promise.all([
    verAgenda
      ? prisma.cita.findMany({
          where: { fechaHora: hoy, estado: { not: "cancelada" } },
          include: {
            paciente: { select: { id: true, nombre: true, apellidos: true, alertasMedicas: true } },
          },
          orderBy: { fechaHora: "asc" },
        })
      : Promise.resolve([]),
    verPacientes
      ? prisma.consentimiento.findMany({
          where: { estado: "pendiente" },
          include: { paciente: { select: { id: true, nombre: true, apellidos: true } } },
        })
      : Promise.resolve([]),
    verStock
      ? prisma.producto.findMany({
          select: { id: true, nombre: true, stockActual: true, stockMinimo: true },
          orderBy: { nombre: "asc" },
        })
      : Promise.resolve([]),
    verLaboratorio
      ? prisma.encargoLaboratorio.findMany({
          where: { estado: { in: ["en_proceso", "listo_para_colocar"] } },
          include: {
            paciente: { select: { id: true, nombre: true, apellidos: true } },
            laboratorio: { select: { nombre: true } },
          },
          orderBy: { fechaEntregaEstimada: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // La lista de citas muestra nombres y alertas médicas: queda en
  // auditoría igual que la Agenda (LOPD-GDD, sección 7).
  if (verAgenda) {
    await registrarAuditoria({
      usuarioId: session!.user.id,
      accion: "VER_AGENDA",
      entidad: "Cita",
      entidadId: format(ahora, "yyyy-MM-dd"),
      detalle: { origen: "inicio" },
    });
  }

  // Prisma no compara dos columnas en un where: se filtra en memoria, igual
  // que en Stock y compras.
  const stockBajo = productos.filter((p) => p.stockActual < p.stockMinimo);
  const pacientesHoy = new Set(citasHoy.map((c) => c.paciente.id));
  const encargosConRetraso = encargos.filter(
    (e) => e.estado === "en_proceso" && e.fechaEntregaEstimada < ahora
  );
  const encargosListos = encargos.filter((e) => e.estado === "listo_para_colocar");
  const sinConfirmar = citasHoy.filter((c) => c.estado === "pendiente_confirmacion");

  const kpis = [
    verAgenda && { label: "Citas hoy", valor: citasHoy.length, href: "/agenda" },
    verAgenda && { label: "Sin confirmar hoy", valor: sinConfirmar.length, href: "/agenda" },
    verPacientes && {
      label: "Consentimientos pendientes",
      valor: consentimientosPendientes.length,
      href: null,
    },
    verStock && { label: "Productos con stock bajo", valor: stockBajo.length, href: "/stock" },
  ].filter(Boolean) as { label: string; valor: number; href: string | null }[];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Inicio</h1>
      <p className="text-sm text-purple-500 mt-1 mb-6">{fechaLarga(ahora)}</p>

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi) => {
            const contenido = (
              <>
                <p className="text-3xl font-mono font-semibold text-purple-700">{kpi.valor}</p>
                <p className="text-sm text-purple-600 mt-1">{kpi.label}</p>
              </>
            );
            const clase = "block bg-white rounded-xl border border-purple-100 p-5";
            return kpi.href ? (
              <Link key={kpi.label} href={kpi.href} className={`${clase} hover:border-purple-200`}>
                {contenido}
              </Link>
            ) : (
              <div key={kpi.label} className={clase}>
                {contenido}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {verAgenda && (
          <section className="lg:col-span-2 bg-white rounded-xl border border-purple-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Citas de hoy</h2>
              <Link href="/agenda" className="text-xs text-purple-600 hover:underline">
                Ver agenda →
              </Link>
            </div>
            {citasHoy.length === 0 ? (
              <p className="text-center py-6 text-purple-400 text-sm">No hay citas para hoy.</p>
            ) : (
              <ul className="divide-y divide-purple-100">
                {citasHoy.map((c) => {
                  const encargoListo = encargosListos.find((e) => e.paciente.id === c.paciente.id);
                  return (
                    <li key={c.id} className="py-3 flex items-start gap-4 text-sm">
                      <span
                        className={`font-mono w-12 shrink-0 ${
                          c.fechaHora < ahora ? "text-purple-300" : "text-purple-700"
                        }`}
                      >
                        {format(c.fechaHora, "HH:mm")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {verPacientes ? (
                            <Link
                              href={`/pacientes/${c.paciente.id}`}
                              className="font-medium hover:underline"
                            >
                              {c.paciente.apellidos}, {c.paciente.nombre}
                            </Link>
                          ) : (
                            <span className="font-medium">
                              {c.paciente.apellidos}, {c.paciente.nombre}
                            </span>
                          )}
                          {/* danger: reservado a avisos médicos (sección 2) */}
                          {c.paciente.alertasMedicas.map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-danger/10 text-danger text-xs px-2 py-0.5"
                            >
                              ⚠ {a}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-purple-500 mt-0.5">
                          {c.tratamiento} · Gabinete {c.gabinete} · {c.duracionMin} min
                          {c.estado === "pendiente_confirmacion" && (
                            <span className="text-purple-700 font-medium"> · Sin confirmar</span>
                          )}
                        </p>
                        {encargoListo && (
                          <p className="text-xs text-purple-800 mt-1">
                            🧪 Su trabajo de laboratorio ya está listo: {encargoListo.trabajo}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <div className="space-y-6">
          {verLaboratorio && (
            <Aviso
              titulo="Laboratorio"
              href="/laboratorio"
              vacio="Sin encargos con retraso ni pendientes de colocar."
              items={[
                ...encargosConRetraso.map((e) => ({
                  id: e.id,
                  texto: `${e.trabajo} · ${e.paciente.apellidos}, ${e.paciente.nombre}`,
                  nota: `Con retraso (${e.laboratorio.nombre}, prevista ${format(
                    e.fechaEntregaEstimada,
                    "d MMM",
                    { locale: es }
                  )})`,
                  destacado: true,
                })),
                ...encargosListos.map((e) => ({
                  id: e.id,
                  texto: `${e.trabajo} · ${e.paciente.apellidos}, ${e.paciente.nombre}`,
                  nota: pacientesHoy.has(e.paciente.id)
                    ? "Listo para colocar · viene hoy"
                    : "Listo para colocar · sin cita hoy",
                  destacado: false,
                })),
              ]}
            />
          )}

          {verStock && (
            <Aviso
              titulo="Stock bajo mínimo"
              href="/stock"
              vacio="Todo el material por encima del mínimo."
              items={stockBajo.map((p) => ({
                id: p.id,
                texto: p.nombre,
                nota: `Quedan ${p.stockActual} (mínimo ${p.stockMinimo})`,
                destacado: true,
              }))}
            />
          )}

          {verPacientes && (
            <Aviso
              titulo="Consentimientos por firmar"
              href={null}
              vacio="No hay consentimientos pendientes."
              items={consentimientosPendientes.map((c) => ({
                id: c.id,
                texto: `${c.paciente.apellidos}, ${c.paciente.nombre}`,
                nota: `${c.tipo}${pacientesHoy.has(c.paciente.id) ? " · viene hoy" : ""}`,
                destacado: pacientesHoy.has(c.paciente.id),
                href: `/pacientes/${c.paciente.id}`,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// "Jueves, 24 de septiembre": solo la primera letra en mayúscula (la clase
// `capitalize` de CSS pondría también "De" en mayúscula).
function fechaLarga(fecha: Date) {
  const texto = format(fecha, "EEEE, d 'de' MMMM", { locale: es });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function Aviso({
  titulo,
  href,
  vacio,
  items,
}: {
  titulo: string;
  href: string | null;
  vacio: string;
  items: { id: string; texto: string; nota: string; destacado: boolean; href?: string }[];
}) {
  return (
    <section className="bg-white rounded-xl border border-purple-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-sm">{titulo}</h2>
        {href && (
          <Link href={href} className="text-xs text-purple-600 hover:underline">
            Abrir →
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-purple-400">{vacio}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="text-sm">
              {i.href ? (
                <Link href={i.href} className="hover:underline">
                  {i.texto}
                </Link>
              ) : (
                <span>{i.texto}</span>
              )}
              <p className={`text-xs ${i.destacado ? "text-purple-800 font-medium" : "text-purple-500"}`}>
                {i.nota}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
