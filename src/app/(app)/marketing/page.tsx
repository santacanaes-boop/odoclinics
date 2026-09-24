import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import SinPermiso from "@/components/SinPermiso";
import ContenidoForm from "@/components/ContenidoForm";
import ContenidosLista from "@/components/ContenidosLista";
import PanelPendiente from "@/components/PanelPendiente";

// Sección 4.8. "Gráfica de origen de nuevos pacientes" se calcula desde
// Paciente.origen real (capturado en /pacientes/nuevo). Los KPIs que
// dependen de APIs externas (Meta Business, Google Business Profile) se
// muestran como pendientes explícitos, nunca con cifras inventadas.
export default async function MarketingPage() {
  const { autorizado } = await requierePermiso("marketing", "lectura");
  if (!autorizado) return <SinPermiso titulo="Marketing y RRSS" />;

  const [contenidos, pacientesPorOrigen] = await Promise.all([
    prisma.contenidoMarketing.findMany({ orderBy: { fecha: "desc" } }),
    prisma.paciente.groupBy({
      by: ["origen"],
      _count: { _all: true },
    }),
  ]);

  const origenes = pacientesPorOrigen
    .map((o) => ({ origen: o.origen ?? "Sin especificar", total: o._count._all }))
    .sort((a, b) => b.total - a.total);
  const maxOrigen = Math.max(1, ...origenes.map((o) => o.total));

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-6">Marketing y RRSS</h1>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-purple-100 p-6">
          <h2 className="font-medium mb-3">Calendario de contenidos</h2>
          <ContenidoForm />
          <div className="mt-4">
            <ContenidosLista contenidos={contenidos} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-purple-100 p-6">
          <h2 className="font-medium mb-1">Origen de nuevos pacientes</h2>
          <p className="text-xs text-purple-500 mb-4">
            Calculado desde el campo “¿Cómo nos ha conocido?” al dar de alta cada paciente.
          </p>
          {origenes.length === 0 ? (
            <p className="text-center py-6 text-purple-500">Todavía no hay pacientes registrados.</p>
          ) : (
            <ul className="space-y-3">
              {origenes.map((o) => (
                <li key={o.origen}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{o.origen}</span>
                    <span className="font-mono text-purple-600">{o.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
                    <div
                      className="h-full bg-purple-700"
                      style={{ width: `${(o.total / maxOrigen) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PanelPendiente
          titulo="Visitas web"
          texto="Requiere conectar Google Analytics (o similar) — sección 4.12."
        />
        <PanelPendiente
          titulo="Seguidores Instagram"
          texto="Requiere Meta Business API con credenciales de la cuenta de la clínica."
        />
        <PanelPendiente
          titulo="Reseñas Google"
          texto="Requiere Google Business Profile API con la ficha verificada de la clínica."
        />
        <PanelPendiente
          titulo="Email marketing"
          texto="Requiere elegir proveedor (Mailchimp, Brevo...) y dar de alta las credenciales cifradas en servidor."
        />
      </div>
    </div>
  );
}
