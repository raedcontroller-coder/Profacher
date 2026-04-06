import { prisma } from "./lib/prisma";

async function check() {
  const roles = await prisma.role.findMany();
  const institutions = await prisma.institution.findMany();
  
  console.log("ROLES:", JSON.stringify(roles, null, 2));
  console.log("INSTITUTIONS:", JSON.stringify(institutions, null, 2));
  
  await prisma.$disconnect();
}

check();
