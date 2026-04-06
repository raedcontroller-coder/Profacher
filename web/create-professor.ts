import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = "prof1@profacher.com";
  const password = "Fecap!2026";
  const fullName = "Professor FECAP 01";
  const roleId = 3; // PROFESSOR
  const institutionId = 1; // FECAP

  console.log("Iniciando criação do professor...");

  try {
    // Verificar se já existe
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("ERRO: Usuário já cadastrado no banco.");
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        roleId,
        institutionId,
      },
    });

    console.log("CADASTRO SUCESSO! Usuário criado:");
    console.log(`ID: ${newUser.id}`);
    console.log(`Email: ${newUser.email}`);
    console.log(`Role ID: ${newUser.roleId}`);
  } catch (error: any) {
    console.error("ERRO AO CRIAR USUÁRIO!");
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
