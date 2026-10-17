import type { DefaultSession } from "next-auth";
import type { Modulo, NivelPermiso } from "@/lib/rbac";

// Campos propios que src/lib/auth.ts añade al usuario, al JWT y a la
// sesión. Tiparlos evita los `as any` y hace que TypeScript detecte un
// error en la autorización (p.ej. un nombre de módulo mal escrito).
export type PermisosRol = Partial<Record<Modulo, NivelPermiso>>;

declare module "next-auth" {
  interface User {
    mfaEnabled: boolean;
    rolId: string;
    rolNombre: string;
    permisos: PermisosRol;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      mfaEnabled: boolean;
      rolId: string;
      rolNombre: string;
      permisos: PermisosRol;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    mfaEnabled?: boolean;
    rolId?: string;
    rolNombre?: string;
    permisos?: PermisosRol;
  }
}
