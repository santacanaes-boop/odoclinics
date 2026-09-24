import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { verificarCodigo } from "./mfa";
import { demasiadosIntentos } from "./rateLimiter";

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
        // Segundo factor (sección 7: MFA). Solo se exige cuando el usuario
        // ya lo tiene activado (Usuario.mfaEnabled) — ver /mfa para
        // activarlo. Queda pendiente hacerlo obligatorio para TODO rol con
        // acceso a historiales antes de manejar pacientes reales.
        otp: { label: "Código de verificación", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate limiting por IP (sección 7), además del bloqueo por cuenta de
        // abajo: sin esto, alguien podría probar contraseñas contra muchos
        // emails distintos desde la misma IP sin bloquear ninguna cuenta.
        const ip =
          (req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
          "desconocida";
        if (demasiadosIntentos(`login:${ip}`)) {
          throw new Error("DEMASIADOS_INTENTOS");
        }

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

        if (usuario.mfaEnabled) {
          if (!credentials.otp) {
            throw new Error("MFA_REQUERIDO");
          }
          if (!usuario.mfaSecret || !verificarCodigo(usuario.mfaSecret, credentials.otp)) {
            throw new Error("MFA_INVALIDO");
          }
        }

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
