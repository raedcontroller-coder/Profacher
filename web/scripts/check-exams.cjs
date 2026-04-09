const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Listando todas as provas no banco de dados...');
  const exams = await prisma.exam.findMany({
    select: {
      id: true,
      title: true,
      accessCode: true,
      status: true,
      teacherId: true
    }
  });
  console.log(JSON.stringify(exams, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
