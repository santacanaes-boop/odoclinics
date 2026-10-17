import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { verificarCodigo } from "./mfa";
import { demasiadosIntentos } from "./rateLimiter";
import type { PermisosRol } from "@/types/next-auth";

// Política de bloqueo de cuenta (sección 7: "Bloqueo de cuenta tras intentos
// fallidos + política de contraseñas robustas").
const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

// Cierre de sesión automático por inactividad (clave en tablet compartida en
// consulta — sección 7). 15 min de sesión inactiva.
const SESSION_MAX_AGE_SEGUNDOS = 15 * 60;

// Hash bcrypt de una contraseña aleatoria, solo para igualar tiempos de
// respuesta cuando el email no existe.
const HASH_FICTICIO = "$2a$10$Bux4TSw0NDg6PssU7JqOK.U3Pl1G3nHM9Rm3M0Kq4r31VhHZB7zfu";

async function registrarIntentoFallido(usuarioId: string, intentosPrevios: number) {
  const intentos = intentosPrevios + 1;
  const bloqueado = intentos >= MAX_INTENTOS;
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      intentosFallidos: bloqueado ? 0 : intentos,
      bloqueadoHasta: bloqueado ? new Date(Date.now() + BLOQUEO_MINUTOS * 60_000) : null,
    },
  });
}

/**
 * IP del cliente para el rate limiting. El primer valor de
 * X-Forwarded-For lo puede escribir el propio atacante (y cambiarlo en
 * cada intento para esquivar el límite); el que añade nuestro proxy
 * inverso es el ÚLTIMO. Se prefiere X-Real-IP si el proxy la fija.
 * Revisar al elegir hosting: depende de cuántos proxies haya delante.
 */
function ipCliente(headers: Record<string, unknown> | undefined): string {
  const realIp = headers?.["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  const xff = headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",").pop()!.trim();
  }
  return "desconocida";
}

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
        // Segundo factor (sección 7: MFA obligatorio). Quien aún no lo tiene
        // configurado entra solo con contraseña, pero con la sesión marcada
        // mfaEnabled=false: src/proxy.ts le lleva a /mfa y requierePermiso()
        // le niega cualquier dato hasta que lo active.
        otp: { label: "Código de verificación", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate limiting por IP (sección 7), además del bloqueo por cuenta de
        // abajo: sin esto, alguien podría probar contraseñas contra muchos
        // emails distintos desde la misma IP sin bloquear ninguna cuenta.
        if (demasiadosIntentos(`login:${ipCliente(req?.headers)}`)) {
          throw new Error("DEMASIADOS_INTENTOS");
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
          include: { rol: true },
        });

        if (!usuario || !usuario.activo) {
          // Mismo coste que una contraseña real: si no, el tiempo de
          // respuesta delata qué emails existen.
          await bcrypt.compare(credentials.password, HASH_FICTICIO);
          return null;
        }

        if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
          throw new Error("CUENTA_BLOQUEADA_TEMPORALMENTE");
        }

        const passwordValida = await bcrypt.compare(
          credentials.password,
          usuario.passwordHash
        );

        if (!passwordValida) {
          await registrarIntentoFallido(usuario.id, usuario.intentosFallidos);
          return null;
        }

        if (usuario.mfaEnabled) {
          if (!credentials.otp) {
            throw new Error("MFA_REQUERIDO");
          }
          // Un código erróneo cuenta como intento fallido: si no, quien
          // conozca la contraseña podría probar los 10^6 códigos sin que la
          // cuenta llegue a bloquearse.
          if (!usuario.mfaSecret || !verificarCodigo(usuario.mfaSecret, credentials.otp)) {
            await registrarIntentoFallido(usuario.id, usuario.intentosFallidos);
            throw new Error("MFA_INVALIDO");
          }
        }

        // Login completo (contraseña + MFA si aplica): resetear contador.
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { intentosFallidos: 0, bloqueadoHasta: null },
        });

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          mfaEnabled: usuario.mfaEnabled,
          rolId: usuario.rolId,
          rolNombre: usuario.rol.nombre,
          permisos: usuario.rol.permisos as PermisosRol,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.mfaEnabled = user.mfaEnabled;
        token.rolId = user.rolId;
        token.rolNombre = user.rolNombre;
        token.permisos = user.permisos;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.mfaEnabled = token.mfaEnabled ?? false;
        session.user.rolId = token.rolId ?? "";
        session.user.rolNombre = token.rolNombre ?? "";
        session.user.permisos = token.permisos ?? {};
      }
      return session;
    },
  },
};
