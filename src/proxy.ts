import { NextResponse, type NextFetchEvent } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";

// Next.js 16 renombra `middleware.ts` a `proxy.ts` (mismo papel) y exige
// exportar una función explícita.
// Protege todo excepto login, assets estáticos y el propio endpoint de auth
// (que incluye /api/auth/mfa/*, necesario para configurar el MFA).
// La autorización fina por módulo/rol vive en src/lib/rbac.ts y se aplica en
// cada página y API route — este proxy solo exige "sesión válida" como
// primera barrera, y lleva a /mfa a quien aún no tiene el segundo factor
// (MFA obligatorio, sección 7). `signIn` debe coincidir con `pages.signIn`
// de src/lib/auth.ts para redirigir a nuestra pantalla de login.
const exigirSesion = withAuth(
  function exigirMfa(req) {
    if (req.nextauth.token?.mfaEnabled) return NextResponse.next();

    const { pathname } = req.nextUrl;
    if (pathname === "/mfa") return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Configura la verificación en dos pasos para continuar" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/mfa", req.url));
  },
  { pages: { signIn: "/login" } }
);

export function proxy(req: NextRequestWithAuth, event: NextFetchEvent) {
  return exigirSesion(req, event);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
