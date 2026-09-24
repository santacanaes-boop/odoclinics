import { prisma } from "@/lib/prisma";
import ProductoForm from "@/components/ProductoForm";
import ProductosTabla from "@/components/ProductosTabla";
import PedidoForm from "@/components/PedidoForm";
import PedidosLista from "@/components/PedidosLista";

// Sección 4.6: inventario con alerta de stock bajo + pedidos a proveedores
// en curso. Los datos son reales desde BD, no hardcoded.
export default async function StockPage() {
  const [productos, proveedores, pedidos] = await Promise.all([
    prisma.producto.findMany({
      include: { proveedor: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.proveedor.findMany({ orderBy: { nombre: "asc" } }),
    prisma.pedidoCompra.findMany({
      include: { proveedor: { select: { nombre: true } } },
      orderBy: { fechaPedido: "desc" },
    }),
  ]);

  const stockBajo = productos.filter((p) => p.stockActual <= p.stockMinimo).length;
  const enCurso = pedidos.filter((p) => p.estado === "en_curso").length;

  const kpis = [
    { label: "Productos en inventario", valor: productos.length },
    { label: "Con stock bajo", valor: stockBajo },
    { label: "Pedidos en curso", valor: enCurso },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-6">Stock y compras</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-purple-100 p-5">
            <p className="text-2xl font-mono font-semibold text-purple-700">{kpi.valor}</p>
            <p className="text-sm text-purple-600 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-purple-100 p-6 mb-4">
        <h2 className="font-medium mb-3">Nuevo producto</h2>
        <ProductoForm />
      </div>

      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden mb-6">
        <h2 className="font-medium p-6 pb-3">Inventario</h2>
        <ProductosTabla productos={productos} />
      </div>

      <div className="bg-white rounded-xl border border-purple-100 p-6 mb-4">
        <h2 className="font-medium mb-3">Nuevo pedido de compra</h2>
        <PedidoForm
          productos={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
          proveedores={proveedores}
        />
      </div>

      <div className="bg-white rounded-xl border border-purple-100 p-6">
        <h2 className="font-medium mb-3">Pedidos a proveedores</h2>
        <PedidosLista pedidos={pedidos} />
      </div>
    </div>
  );
}
