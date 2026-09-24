import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Toda esta sección requiere sesión válida. La comprobación real de
  // permisos por módulo ocurre además en cada API route (ver src/lib/rbac.ts) —
  // esto aquí solo evita que un usuario no autenticado vea el layout.
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar permisos={session.user?.permisos ?? {}} />
      <main className="flex-1 p-6 lg:p-10 pt-16 lg:pt-10">{children}</main>
    </div>
  );
}
