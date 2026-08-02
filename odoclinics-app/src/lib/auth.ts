import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Política de bloqueo de cuenta (sección 7: "Bloqueo de cuenta tras intentos
// fallidos + política de contraseñas robustas").
const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

// Cierre de sesión automático por inactividad (clave en tablet compartida en
// consulta — sección 7). 15 min de sesión inactiva.
const SESSION_MAX_AGE_SEGUNDOS = 15 * 60;

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SEGUNDOS,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        // TODO Fase 2: campo mfaCode obligatorio para roles con acceso a
        // historiales clínicos (sección 7: MFA obligatorio, no opcional).
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
          include: { rol: true },
        });

        if (!usuario || !usuario.activo) return null;

        if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
          throw new Error("CUENTA_BLOQUEADA_TEMPORALMENTE");
        }

        const passwordValida = await bcrypt.compare(
          credentials.password,
          usuario.passwordHash
        );

        if (!passwordValida) {
          const intentos = usuario.intentosFallidos + 1;
          const bloqueado = intentos >= MAX_INTENTOS;
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
              intentosFallidos: bloqueado ? 0 : intentos,
              bloqueadoHasta: bloqueado
                ? new Date(Date.now() + BLOQUEO_MINUTOS * 60_000)
                : null,
            },
          });
          return null;
        }

        // Login correcto: resetear contador de intentos fallidos
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { intentosFallidos: 0, bloqueadoHasta: null },
        });

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rolId: usuario.rolId,
          rolNombre: usuario.rol.nombre,
          permisos: usuario.rol.permisos,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rolId = (user as any).rolId;
        token.rolNombre = (user as any).rolNombre;
        token.permisos = (user as any).permisos;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).rolId = token.rolId;
        (session.user as any).rolNombre = token.rolNombre;
        (session.user as any).permisos = token.permisos;
      }
      return session;
    },
  },
};
