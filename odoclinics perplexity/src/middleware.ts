export { default } from "next-auth/middleware";

// Protege todo excepto login, assets estáticos y el propio endpoint de auth.
// La autorización fina por módulo/rol vive en src/lib/rbac.ts y se aplica en
// cada API route — este middleware solo exige "sesión válida" como primera
// barrera.
export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
