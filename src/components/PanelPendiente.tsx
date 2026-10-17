// Panel informativo para funcionalidades que dependen de una integración
// externa real (APIs de terceros, certificados, credenciales) que este
// scaffold no puede simular. Nunca se rellena con cifras inventadas — ver
// CLAUDE.md: "nunca con datos de relleno engañosos".
export default function PanelPendiente({
  titulo,
  texto,
  fase = 6,
}: {
  titulo: string;
  texto: string;
  fase?: number;
}) {
  return (
    <div className="bg-purple-50 rounded-xl border border-purple-100 p-5">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-medium text-purple-700">{titulo}</h3>
        <span className="rounded-full bg-purple-100 text-purple-500 text-xs font-medium px-2 py-0.5">
          Pendiente · Fase {fase}
        </span>
      </div>
      <p className="text-xs text-purple-500">{texto}</p>
    </div>
  );
}
