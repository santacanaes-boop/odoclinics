// Se muestra cuando requierePermiso() deniega el acceso a una página. La
// barrera real es la comprobación en servidor de la propia página (y de su
// API); ocultar el módulo en el Sidebar es solo cosmético (sección 4.11).
export default function SinPermiso({ titulo }: { titulo: string }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-6">{titulo}</h1>
      <p className="text-purple-600">
        No tienes permiso para ver este módulo. Si lo necesitas, pídeselo a un administrador.
      </p>
    </div>
  );
}
