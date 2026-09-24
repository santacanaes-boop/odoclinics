import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import { registrarAuditoria } from "@/lib/audit";
import SinPermiso from "@/components/SinPermiso";
import { cifrarDeterminista } from "@/lib/cifrado";
import { pareceDniNieCompleto } from "@/lib/dniNie";

export default async function PacientesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { autorizado, session } = await requierePermiso("pacientes", "lectura");
  if (!autorizado) return <SinPermiso titulo="Pacientes" />;

  const q = searchParams.q?.trim();

  const pacientes = await prisma.paciente.findMany({
    // dniNie va cifrado (sección 7) con cifrado determinista: solo permite
    // coincidencia exacta, no "contains" — ver src/lib/cifrado.ts.
    where: q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { apellidos: { contains: q, mode: "insensitive" } },
            ...(pareceDniNieCompleto(q) ? [{ dniNie: cifrarDeterminista(q.trim()) }] : []),
          ],
        }
      : undefined,
    orderBy: { apellidos: "asc" },
  });

  // LOPD-GDD (sección 7): el listado también expone datos de pacientes, así
  // que se registra quién lo consulta (y qué buscó), no solo la ficha.
  await registrarAuditoria({
    usuarioId: session!.user.id,
    accion: "VER_LISTADO_PACIENTES",
    entidad: "Paciente",
    entidadId: "listado",
    detalle: { busqueda: q ?? null, resultados: pacientes.length },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-semibold">Pacientes</h1>
        <Link
          href="/pacientes/nuevo"
          className="rounded-lg bg-purple-700 text-white px-4 py-2 text-sm font-medium hover:bg-purple-800"
        >
          + Nuevo paciente
        </Link>
      </div>

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, apellidos o DNI/NIE…"
          className="w-full max-w-md rounded-lg border border-purple-200 px-4 py-3"
        />
      </form>

      {pacientes.length === 0 ? (
        <div className="bg-white rounded-xl border border-purple-100 p-10 text-center text-purple-600">
          {q ? "Ningún paciente coincide con esa búsqueda." : "Todavía no hay pacientes registrados."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-purple-100 text-purple-700 text-left">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">DNI/NIE</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Alertas médicas</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map((p) => (
                <tr key={p.id} className="border-t border-purple-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="font-medium text-purple-700 hover:underline"
                    >
                      {p.apellidos}, {p.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono">{p.dniNie}</td>
                  <td className="px-4 py-3">{p.telefono}</td>
                  <td className="px-4 py-3">
                    {p.alertasMedicas.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-danger font-medium">
                        ⚠ {p.alertasMedicas.join(", ")}
                      </span>
                    ) : (
                      <span className="text-purple-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
