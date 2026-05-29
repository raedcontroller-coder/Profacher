const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const insts = await prisma.institution.findMany({ select: { name: true, customAiModel: true, hasIntegratedAi: true } });
  console.table(insts);
  const global = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  console.log(global);
}
main().finally(() => prisma.$disconnect());
