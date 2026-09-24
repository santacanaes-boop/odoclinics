import { PrismaClient } from "@prisma/client";
import { cifrar, descifrar, cifrarDeterminista, descifrarDeterminista } from "./cifrado";

// Cifrado de campo real (sección 7) aplicado de forma transparente vía
// Prisma Client Extensions — ninguna ruta necesita saber que estos campos
// van cifrados en BD. Cubre los campos marcados `// CIFRAR` en
// prisma/schema.prisma: Paciente.dniNie/telefono/email/direccion,
// Anamnesis.* y Usuario.mfaSecret.
//
// dniNie usa cifrado determinista (misma entrada → mismo resultado) para
// no romper su @unique ni la búsqueda exacta — ver src/lib/cifrado.ts para
// el porqué. Esto significa que la búsqueda PARCIAL de DNI ya no funciona;
// ver el comentario en src/app/api/pacientes/route.ts.

function soloTexto(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length > 0;
}

// Los campos de lista (String[]) admiten en `update` tanto un array plano
// como `{ set: [...] }` — cubrimos ambas formas, no `push`/`unshift` (no
// hay ninguna ruta que los use hoy).
function transformarLista(
  valor: unknown,
  transformar: (s: string) => string
): unknown {
  if (Array.isArray(valor)) return valor.map(transformar);
  if (valor && typeof valor === "object" && "set" in (valor as any) && Array.isArray((valor as any).set)) {
    return { ...(valor as any), set: (valor as any).set.map(transformar) };
  }
  return valor;
}

function crearPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      paciente: {
        async create({ args, query }) {
          const data = args.data as any;
          if (soloTexto(data.dniNie)) data.dniNie = cifrarDeterminista(data.dniNie);
          if (soloTexto(data.telefono)) data.telefono = cifrar(data.telefono);
          if (soloTexto(data.email)) data.email = cifrar(data.email);
          if (soloTexto(data.direccion)) data.direccion = cifrar(data.direccion);
          return query(args);
        },
        async update({ args, query }) {
          const data = args.data as any;
          if (soloTexto(data.dniNie)) data.dniNie = cifrarDeterminista(data.dniNie);
          if (soloTexto(data.telefono)) data.telefono = cifrar(data.telefono);
          if (soloTexto(data.email)) data.email = cifrar(data.email);
          if (soloTexto(data.direccion)) data.direccion = cifrar(data.direccion);
          return query(args);
        },
      },
      anamnesis: {
        async create({ args, query }) {
          const data = args.data as any;
          data.patologiasPrevias = transformarLista(data.patologiasPrevias, cifrar);
          data.alergiasMedicamentosas = transformarLista(data.alergiasMedicamentosas, cifrar);
          data.medicacionHabitual = transformarLista(data.medicacionHabitual, cifrar);
          return query(args);
        },
        async update({ args, query }) {
          const data = args.data as any;
          if ("patologiasPrevias" in data) data.patologiasPrevias = transformarLista(data.patologiasPrevias, cifrar);
          if ("alergiasMedicamentosas" in data) data.alergiasMedicamentosas = transformarLista(data.alergiasMedicamentosas, cifrar);
          if ("medicacionHabitual" in data) data.medicacionHabitual = transformarLista(data.medicacionHabitual, cifrar);
          return query(args);
        },
        async upsert({ args, query }) {
          const create = args.create as any;
          create.patologiasPrevias = transformarLista(create.patologiasPrevias, cifrar);
          create.alergiasMedicamentosas = transformarLista(create.alergiasMedicamentosas, cifrar);
          create.medicacionHabitual = transformarLista(create.medicacionHabitual, cifrar);
          const update = args.update as any;
          if ("patologiasPrevias" in update) update.patologiasPrevias = transformarLista(update.patologiasPrevias, cifrar);
          if ("alergiasMedicamentosas" in update) update.alergiasMedicamentosas = transformarLista(update.alergiasMedicamentosas, cifrar);
          if ("medicacionHabitual" in update) update.medicacionHabitual = transformarLista(update.medicacionHabitual, cifrar);
          return query(args);
        },
      },
      usuario: {
        async create({ args, query }) {
          const data = args.data as any;
          if (soloTexto(data.mfaSecret)) data.mfaSecret = cifrar(data.mfaSecret);
          return query(args);
        },
        async update({ args, query }) {
          const data = args.data as any;
          if (soloTexto(data.mfaSecret)) data.mfaSecret = cifrar(data.mfaSecret);
          return query(args);
        },
      },
    },
    result: {
      paciente: {
        dniNie: { needs: { dniNie: true }, compute: (p) => descifrarDeterminista(p.dniNie) },
        telefono: { needs: { telefono: true }, compute: (p) => descifrar(p.telefono) },
        email: { needs: { email: true }, compute: (p) => (p.email ? descifrar(p.email) : p.email) },
        direccion: {
          needs: { direccion: true },
          compute: (p) => (p.direccion ? descifrar(p.direccion) : p.direccion),
        },
      },
      anamnesis: {
        patologiasPrevias: { needs: { patologiasPrevias: true }, compute: (a) => a.patologiasPrevias.map(descifrar) },
        alergiasMedicamentosas: {
          needs: { alergiasMedicamentosas: true },
          compute: (a) => a.alergiasMedicamentosas.map(descifrar),
        },
        medicacionHabitual: {
          needs: { medicacionHabitual: true },
          compute: (a) => a.medicacionHabitual.map(descifrar),
        },
      },
      usuario: {
        mfaSecret: {
          needs: { mfaSecret: true },
          compute: (u) => (u.mfaSecret ? descifrar(u.mfaSecret) : u.mfaSecret),
        },
      },
    },
  });
}

// Evita crear múltiples instancias en desarrollo con hot-reload de Next.js
const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof crearPrismaClient> };

export const prisma = globalForPrisma.prisma ?? crearPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
