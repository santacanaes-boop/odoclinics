// Seed de arranque: crea el rol "Administrador" (acceso total a los 10 módulos)
// y los dos usuarios actuales de la clínica, tal como describe la sección 1
// y 4.11 de la especificación: mientras el equipo sea reducido, ambos tienen
// acceso total, con aviso explícito de que esto es un estado temporal.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MODULOS = [
  "inicio",
  "agenda",
  "pacientes",
  "laboratorio",
  "contabilidad",
  "stock",
  "informes",
  "marketing",
  "seguimiento",
  "proteccion_datos",
  "roles",
  "integraciones",
] as const;

async function main() {
  const permisosTotal = Object.fromEntries(MODULOS.map((m) => [m, "total"]));

  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: "Administrador" },
    update: { permisos: permisosTotal },
    create: { nombre: "Administrador", permisos: permisosTotal },
  });

  const usuarios = [
    {
      nombre: "Dra. Olivia Domínguez Choque",
      email: "olivia@odoclinics.es",
      passwordInicial: process.env.SEED_PASSWORD_OLIVIA ?? "cambiar-en-primer-login",
    },
    {
      nombre: "Jaume Santacana",
      email: "jaume@odoclinics.es",
      passwordInicial: process.env.SEED_PASSWORD_JAUME ?? "cambiar-en-primer-login",
    },
  ];

  for (const u of usuarios) {
    const passwordHash = await bcrypt.hash(u.passwordInicial, 12);
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: {
        nombre: u.nombre,
        email: u.email,
        passwordHash,
        rolId: rolAdmin.id,
      },
    });
  }

  console.log("Seed completado: rol Administrador + 2 usuarios iniciales.");
  console.log(
    "IMPORTANTE: cambia las contraseñas iniciales y activa MFA antes de usar en producción."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
