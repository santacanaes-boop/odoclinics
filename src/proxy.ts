import type { NextFetchEvent } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";

// Next.js 16 renombra `middleware.ts` a `proxy.ts` (mismo papel) y exige
// exportar una función explícita.
// Protege todo excepto login, assets estáticos y el propio endpoint de auth.
// La autorización fina por módulo/rol vive en src/lib/rbac.ts y se aplica en
// cada página y API route — este proxy solo exige "sesión válida" como
// primera barrera. `signIn` debe coincidir con `pages.signIn` de
// src/lib/auth.ts para redirigir a nuestra pantalla de login.
const exigirSesion = withAuth({ pages: { signIn: "/login" } });

export function proxy(req: NextRequestWithAuth, event: NextFetchEvent) {
  return exigirSesion(req, event);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
