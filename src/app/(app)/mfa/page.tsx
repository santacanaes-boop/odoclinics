import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MfaSetup from "@/components/MfaSetup";
import MfaDesactivar from "@/components/MfaDesactivar";

// Sección 7: MFA obligatoria para todos los usuarios. Es la única página a
// la que src/proxy.ts deja entrar a quien aún no la ha configurado.
// No es un módulo del RBAC (sección 4.11) — es la seguridad de la propia
// cuenta del usuario autenticado.
export default async function MfaPage() {
  const session = await getServerSession(authOptions);
  const usuario = await prisma.usuario.findUnique({
    where: { id: session!.user.id },
    select: { mfaEnabled: true },
  });

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl font-semibold mb-6">Verificación en dos pasos</h1>
      <div className="bg-white rounded-xl border border-purple-100 p-6">
        {usuario?.mfaEnabled ? <MfaDesactivar /> : <MfaSetup />}
      </div>
    </div>
  );
}
