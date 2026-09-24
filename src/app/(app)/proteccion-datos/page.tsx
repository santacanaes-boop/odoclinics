import { prisma } from "@/lib/prisma";
import { requierePermiso } from "@/lib/rbac";
import SinPermiso from "@/components/SinPermiso";
import ChecklistCumplimiento from "@/components/ChecklistCumplimiento";
import EsterilizacionForm from "@/components/EsterilizacionForm";
import PanelPendiente from "@/components/PanelPendiente";

// Sección 4.10, tres bloques. El checklist es una atestación manual (quien
// marca un ítem confirma que ya lo ha hecho de verdad en su
// infraestructura real) — no hay ningún escáner automático detrás, y las
// copias de seguridad son justo eso: un ítem a marcar, no un histórico
// falso, porque este scaffold no tiene infraestructura de backups real
// que auditar.
const ITEMS_RGPD = [
  "Registro de actividades de tratamiento (art. 30 RGPD) documentado",
  "Contratos de encargado de tratamiento firmados con hosting/backups/mensajería/IA",
  "Política de conservación de historiales (mínimo 5 años, Ley 41/2002) documentada",
  "Procedimiento de gestión de consentimientos informados en vigor",
  "Copias de seguridad diarias, cifradas, con retención de 12 meses, configuradas",
  "Protocolo de notificación de brechas a la AEPD (72h) documentado",
];

const ITEMS_CIBERSEGURIDAD = [
  "Autenticación multifactor (MFA) obligatoria para roles con acceso a historiales",
  "Bloqueo de cuenta tras intentos fallidos + política de contraseñas robustas",
  "Cierre de sesión automático por inactividad",
  "Permisos por rol aplicados en el servidor, no solo ocultos en la interfaz",
  "HTTPS/TLS obligatorio en todo momento",
  "Base de datos cifrada en reposo + cifrado a nivel de campo para historiales",
  "Copias de seguridad cifradas en ubicación distinta al servidor principal",
  "Registro de auditoría de accesos a historiales (quién consulta, no solo quién modifica)",
  "Validación y saneado de inputs en servidor",
  "Cookies de sesión HttpOnly + Secure, protección CSRF",
  "Ninguna clave de API en el código del cliente",
  "Rate limiting frente a fuerza bruta",
  "Alojamiento dentro de la UE",
  "Auditoría de seguridad (pentest) realizada antes de producción con datos reales",
];

export default async function ProteccionDatosPage() {
  const { autorizado } = await requierePermiso("proteccion_datos", "lectura");
  if (!autorizado) return <SinPermiso titulo="Protección de datos" />;

  // Idempotente: asegura que el checklist tenga sus ítems por defecto.
  await prisma.checklistItem.createMany({
    data: [
      ...ITEMS_RGPD.map((texto) => ({ categoria: "rgpd", texto })),
      ...ITEMS_CIBERSEGURIDAD.map((texto) => ({ categoria: "ciberseguridad", texto })),
    ],
    skipDuplicates: true,
  });

  const [itemsRgpd, itemsCiberseguridad, ciclos] = await Promise.all([
    prisma.checklistItem.findMany({ where: { categoria: "rgpd" }, orderBy: { texto: "asc" } }),
    prisma.checklistItem.findMany({
      where: { categoria: "ciberseguridad" },
      orderBy: { texto: "asc" },
    }),
    prisma.cicloEsterilizacion.findMany({ orderBy: { fecha: "desc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-6">Protección de datos</h1>

      <div className="bg-white rounded-xl border border-purple-100 p-6 mb-6">
        <h2 className="font-medium mb-1">RGPD y copias de seguridad</h2>
        <p className="text-xs text-purple-500 mb-3">
          Marca un ítem cuando lo hayas configurado de verdad en vuestra infraestructura —
          esto no lo comprueba automáticamente.
        </p>
        <ChecklistCumplimiento items={itemsRgpd} />
      </div>

      <div className="bg-white rounded-xl border border-purple-100 p-6 mb-6">
        <h2 className="font-medium mb-3">Equipos y esterilización</h2>
        <EsterilizacionForm ciclos={ciclos} />
      </div>

      <div className="bg-white rounded-xl border border-purple-100 p-6 mb-6">
        <h2 className="font-medium mb-1">Ciberseguridad</h2>
        <p className="text-xs text-purple-500 mb-3">
          Mismo checklist que la sección 7 de la especificación técnica.
        </p>
        <ChecklistCumplimiento items={itemsCiberseguridad} />
      </div>

      <PanelPendiente
        titulo="Pentest y auditoría externa"
        texto="Una auditoría de seguridad independiente antes de manejar pacientes reales no se puede sustituir por un checklist interno — requiere contratar una empresa de ciberseguridad."
      />
    </div>
  );
}
