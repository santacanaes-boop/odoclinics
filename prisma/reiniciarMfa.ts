import { PrismaClient } from "@prisma/client";

// Reinicia el MFA de un usuario que ha perdido el móvil (sección 7, MFA
// obligatorio). Uso, desde el servidor y solo por un administrador:
//
//   npm run mfa:reiniciar -- usuario@odoclinics.es
//
// Borra su secreto: en el siguiente login entrará con la contraseña y la
// app le obligará a configurar el MFA de nuevo antes de ver ningún dato.
// Queda registrado en la auditoría a nombre del propio usuario afectado
// (no hay sesión de administrador en un script de consola).
// TODO: sustituir por una acción en el módulo de Roles cuando exista.
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Indica el email: npm run mfa:reiniciar -- usuario@odoclinics.es");
    process.exit(1);
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    console.error(`No existe ningún usuario con el email ${email}`);
    process.exit(1);
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { mfaEnabled: false, mfaSecret: null },
  });
  await prisma.registroAuditoria.create({
    data: {
      usuarioId: usuario.id,
      accion: "REINICIAR_MFA_CONSOLA",
      entidad: "Usuario",
      entidadId: usuario.id,
    },
  });

  console.log(`MFA reiniciado para ${email}. Deberá configurarlo de nuevo al entrar.`);
}

main().finally(() => prisma.$disconnect());
